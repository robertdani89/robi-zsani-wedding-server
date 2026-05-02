import {
  BadRequestException,
  Injectable,
  Logger,
  NotFoundException,
  OnModuleDestroy,
  OnModuleInit,
} from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import { IsNull, Repository } from "typeorm";
import { Song } from "./song.entity";
import { CreateSongDto } from "./dto/create-song.dto";
import { Person } from "../person/person.entity";

// Spotify API types
interface SpotifyTrack {
  id: string;
  name: string;
  artists: { name: string }[];
  album: {
    name: string;
    images: { url: string; height: number; width: number }[];
  };
  preview_url: string | null;
}

interface SpotifySearchResponse {
  tracks: {
    items: SpotifyTrack[];
  };
}

interface SpotifyTokenResponse {
  access_token: string;
  token_type: string;
  expires_in: number;
}

interface SpotifyMeResponse {
  id: string;
  product: string;
  email?: string;
}

interface SpotifyDevice {
  id: string | null;
  is_active: boolean;
  is_private_session: boolean;
  is_restricted: boolean;
  name: string;
  type: string;
  volume_percent: number | null;
}

interface SpotifyDevicesResponse {
  devices: SpotifyDevice[];
}

interface SpotifyPlayerState {
  is_playing: boolean;
  progress_ms: number | null;
  item: {
    id: string;
    duration_ms: number;
  } | null;
  actions?: {
    disallows?: {
      pausing?: boolean;
      resuming?: boolean;
      skipping_prev?: boolean;
      skipping_next?: boolean;
    };
  };
}

interface SpotifyPlaylistTrackItem {
  track: {
    id: string | null;
    is_local?: boolean;
  } | null;
}

interface SpotifyPlaylistTracksResponse {
  items: SpotifyPlaylistTrackItem[];
  next: string | null;
}

const defaultEventId = process.env.DEFAULT_EVENT_ID || "6dab8568-a879-4b32-bd8e-46288805d817";
const fallbackPlaylistId = "7jo77oC6G1fYY0xhaLN0wf";


@Injectable()
export class SongService implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(SongService.name);
  private readonly playerCheckIntervalMs = 5000;
  private spotifyToken: string | null = null;
  private tokenExpiry: number = 0;
  private spotifyClientToken: string | null = null;
  private spotifyClientTokenExpiry: number = 0;
  private playerMonitorTimer: NodeJS.Timeout | null = null;
  private isPlayerCheckRunning = false;
  private playedFallbackTrackIds = new Set<string>();
  private consecutiveFallbackRepeatPicks = 0;

  constructor(
    @InjectRepository(Song)
    private songRepository: Repository<Song>,
    @InjectRepository(Person)
    private personRepository: Repository<Person>,
  ) { }

  onModuleInit() {
    this.logger.log(
      `Starting Spotify player monitor (interval=${this.playerCheckIntervalMs}ms, eventId=${defaultEventId})`,
    );
    this.startPlayerMonitor();
  }

  onModuleDestroy() {
    if (this.playerMonitorTimer) {
      clearInterval(this.playerMonitorTimer);
      this.playerMonitorTimer = null;
      this.logger.log("Stopped Spotify player monitor");
    }
  }

  private startPlayerMonitor() {
    if (this.playerMonitorTimer) {
      return;
    }

    this.playerMonitorTimer = setInterval(() => {
      this.checkPlayerAndQueueNextSong().catch((err) => {
        this.logger.error("Error in player monitor", err);
      });
    }, this.playerCheckIntervalMs);

    this.checkPlayerAndQueueNextSong().catch((err) => {
      this.logger.error("Error during initial player check", err);
    });
  }

  private async checkPlayerAndQueueNextSong() {
    if (this.isPlayerCheckRunning) {
      this.logger.debug("Skipping player check because previous check is still running");
      return;
    }

    this.isPlayerCheckRunning = true;

    try {
      const shouldQueueNextSong = await this.shouldQueueNextSong();
      if (!shouldQueueNextSong) {
        return;
      }

      this.logger.log("Player check result: queueing next song");
      await this.playNextSong();
    } finally {
      this.isPlayerCheckRunning = false;
    }
  }

  private async playNextSong() {
    const nextSong = await this.findNextToPlay(defaultEventId);

    if (nextSong) {
      this.logger.log(
        `Starting queued song: ${nextSong.name} (${nextSong.spotifyId})`,
      );
      await this.playSongOnSpotifyClient(nextSong.spotifyId);
      return;
    }

    const fallbackTrackId = await this.pickFallbackTrackIdFromPlaylist();
    this.logger.log(
      `Queue empty, starting fallback playlist song: ${fallbackTrackId}`,
    );
    await this.playSongOnSpotifyClient(fallbackTrackId);
  }

  private async getFallbackPlaylistTrackIds(): Promise<string[]> {
    const trackIds: string[] = [];
    let nextUrl = `https://api.spotify.com/v1/playlists/${fallbackPlaylistId}/tracks?limit=100&fields=items(track(id,is_local)),next`;

    while (nextUrl) {
      const response = await this.spotifyClientRequest(nextUrl);

      if (!response.ok) {
        const errorBody = await response.text();
        throw new Error(
          `Failed to fetch fallback playlist tracks (${response.status}): ${errorBody}`,
        );
      }

      const data: SpotifyPlaylistTracksResponse = await response.json();
      for (const item of data.items || []) {
        const trackId = item.track?.id;
        const isLocal = item.track?.is_local;
        if (trackId && !isLocal) {
          trackIds.push(trackId);
        }
      }

      nextUrl = data.next;
    }

    return trackIds;
  }

  private async pickFallbackTrackIdFromPlaylist(): Promise<string> {
    const playlistTrackIds = await this.getFallbackPlaylistTrackIds();
    if (playlistTrackIds.length === 0) {
      throw new Error(
        `Fallback playlist ${fallbackPlaylistId} has no playable tracks.`,
      );
    }

    const maxAttempts = Math.max(5, playlistTrackIds.length * 2);

    for (let i = 0; i < maxAttempts; i += 1) {
      const randomIndex = Math.floor(Math.random() * playlistTrackIds.length);
      const candidateTrackId = playlistTrackIds[randomIndex];

      if (!this.playedFallbackTrackIds.has(candidateTrackId)) {
        this.playedFallbackTrackIds.add(candidateTrackId);
        this.consecutiveFallbackRepeatPicks = 0;
        return candidateTrackId;
      }

      this.consecutiveFallbackRepeatPicks += 1;
      this.logger.debug(
        `Fallback pick already played (track=${candidateTrackId}, repeatStreak=${this.consecutiveFallbackRepeatPicks})`,
      );

      if (this.consecutiveFallbackRepeatPicks >= 5) {
        this.playedFallbackTrackIds.clear();
        this.consecutiveFallbackRepeatPicks = 0;
        this.logger.warn(
          "Fallback played cache reset after 5 consecutive repeat picks",
        );
      }
    }

    // Last-resort fallback if random attempts keep hitting played songs.
    this.playedFallbackTrackIds.clear();
    this.consecutiveFallbackRepeatPicks = 0;
    const forcedTrackId =
      playlistTrackIds[Math.floor(Math.random() * playlistTrackIds.length)];
    this.playedFallbackTrackIds.add(forcedTrackId);
    this.logger.warn(
      "Fallback selection exhausted random attempts, forced cache reset and picked a random track",
    );
    return forcedTrackId;
  }

  private async shouldQueueNextSong(): Promise<boolean> {
    const response = await this.spotifyClientRequest(
      "https://api.spotify.com/v1/me/player",
    );

    if (response.status === 204) {
      return false;
    }

    if (!response.ok) {
      const errorBody = await response.text();
      const reason = this.extractSpotifyErrorReason(errorBody);

      if (reason === "NO_ACTIVE_DEVICE") {
        // Avoid polling-triggered play attempts when there is no active Spotify device.
        this.logger.debug("Spotify player state: no active device");
        return false;
      }

      throw new Error(
        `Failed to fetch Spotify player state (${response.status}): ${errorBody}`,
      );
    }

    const playerState: SpotifyPlayerState = await response.json();
    const itemLength = playerState.item?.duration_ms || 0;

    if (playerState.is_playing) {
      return false;
    }

    if (playerState?.progress_ms === 0 || playerState?.progress_ms >= itemLength - 5000) {
      this.logger.debug(
        `Spotify player state: ended/at boundary (progress=${playerState?.progress_ms}, duration=${itemLength})`,
      );
      return true;
    }

    return false;
  }

  private async getSpotifyToken(): Promise<string> {
    // Check if we have a valid token
    if (this.spotifyToken && Date.now() < this.tokenExpiry) {
      return this.spotifyToken;
    }


    const clientId = process.env.SPOTIFY_CLIENT_ID;
    const clientSecret = process.env.SPOTIFY_CLIENT_SECRET;

    if (!clientId || !clientSecret) {
      throw new Error(
        "Spotify credentials not configured. Set SPOTIFY_CLIENT_ID and SPOTIFY_CLIENT_SECRET environment variables.",
      );
    }

    const response = await fetch("https://accounts.spotify.com/api/token", {
      method: "POST",
      headers: {
        "Content-Type": "application/x-www-form-urlencoded",
        Authorization:
          "Basic " +
          Buffer.from(`${clientId}:${clientSecret}`).toString("base64"),
      },
      body: "grant_type=client_credentials",
    });

    if (!response.ok) {
      throw new Error(`Failed to get Spotify token: ${response.statusText}`);
    }

    const data: SpotifyTokenResponse = await response.json();
    this.spotifyToken = data.access_token;
    // Set expiry 5 minutes before actual expiry for safety
    this.tokenExpiry = Date.now() + (data.expires_in - 300) * 1000;

    return this.spotifyToken;
  }

  private async getSpotifyClientToken(forceRefresh = false): Promise<string> {
    if (
      !forceRefresh &&
      this.spotifyClientToken &&
      Date.now() < this.spotifyClientTokenExpiry
    ) {
      return this.spotifyClientToken;
    }

    this.logger.debug(
      forceRefresh
        ? "Refreshing Spotify client token (forced)"
        : "Refreshing Spotify client token",
    );

    return this.refreshSpotifyClientToken();
  }

  private async refreshSpotifyClientToken(): Promise<string> {
    const refreshToken = process.env.SPOTIFY_REFRESH_TOKEN;
    const clientId = process.env.SPOTIFY_CLIENT_ID;
    const clientSecret = process.env.SPOTIFY_CLIENT_SECRET;

    if (!refreshToken || !clientId || !clientSecret) {
      throw new Error(
        "Spotify user token credentials not configured. Set SPOTIFY_REFRESH_TOKEN, SPOTIFY_CLIENT_ID and SPOTIFY_CLIENT_SECRET.",
      );
    }

    const response = await fetch("https://accounts.spotify.com/api/token", {
      method: "POST",
      headers: {
        "Content-Type": "application/x-www-form-urlencoded",
        Authorization:
          "Basic " +
          Buffer.from(`${clientId}:${clientSecret}`).toString("base64"),
      },
      body: new URLSearchParams({
        grant_type: "refresh_token",
        refresh_token: refreshToken,
      }),
    });

    if (!response.ok) {
      const errorBody = await response.text();
      throw new Error(
        `Failed to refresh Spotify client token (${response.status}): ${errorBody}`,
      );
    }

    const data: SpotifyTokenResponse = await response.json();
    this.spotifyClientToken = data.access_token;
    this.spotifyClientTokenExpiry = Date.now() + Math.max(0, (data.expires_in - 60) * 1000);

    this.logger.log("Spotify client token refreshed successfully");

    return this.spotifyClientToken;
  }

  private async spotifyClientRequest(
    url: string,
    init: RequestInit = {},
    allowRefreshRetry = true,
  ): Promise<Response> {
    const token = await this.getSpotifyClientToken();
    const headers = {
      ...(init.headers as Record<string, string>),
      Authorization: `Bearer ${token}`,
    };

    let response = await fetch(url, {
      ...init,
      headers,
    });

    if (response.status === 401 && allowRefreshRetry) {
      this.logger.warn("Spotify request returned 401, refreshing token and retrying once");
      await this.getSpotifyClientToken(true);
      const refreshedToken = await this.getSpotifyClientToken();

      response = await fetch(url, {
        ...init,
        headers: {
          ...(init.headers as Record<string, string>),
          Authorization: `Bearer ${refreshedToken}`,
        },
      });
    }

    return response;
  }

  private async getSpotifyClientProfile(
    clientToken: string,
  ): Promise<SpotifyMeResponse | null> {
    const response = await this.spotifyClientRequest("https://api.spotify.com/v1/me", {
      headers: {
        Authorization: `Bearer ${clientToken}`,
      },
    });

    if (!response.ok) {
      return null;
    }

    return response.json();
  }

  private async getSpotifyPlayerClients(): Promise<SpotifyDevice[]> {
    const response = await this.spotifyClientRequest(
      "https://api.spotify.com/v1/me/player/devices",
    );

    if (!response.ok) {
      const errorBody = await response.text();
      throw new Error(
        `Failed to fetch Spotify devices (${response.status}): ${errorBody}`,
      );
    }

    const data: SpotifyDevicesResponse = await response.json();
    return data.devices || [];
  }

  private async activateSpotifyDevice(deviceId: string): Promise<void> {
    const response = await this.spotifyClientRequest(
      "https://api.spotify.com/v1/me/player",
      {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          device_ids: [deviceId],
          play: false,
        }),
      },
    );

    if (!response.ok) {
      const errorBody = await response.text();
      throw new Error(
        `Failed to activate Spotify device (${response.status}): ${errorBody}`,
      );
    }
  }


  private async activateFirstAvailableSpotifyDevice(): Promise<SpotifyDevice | null> {
    const devices = await this.getSpotifyPlayerClients();
    if (devices.length === 0) {
      return null;
    }

    const targetDevice =
      devices.find((device) => device.is_active && !!device.id) ||
      devices.find((device) => !device.is_restricted && !!device.id);

    if (!targetDevice?.id) {
      return null;
    }

    await this.activateSpotifyDevice(targetDevice.id);
    return targetDevice;
  }

  private extractSpotifyErrorReason(errorBody: string): string {
    try {
      const parsedError = JSON.parse(errorBody);
      return parsedError?.error?.reason || "";
    } catch {
      return "";
    }
  }

  private async playSongOnSpotifyClient(spotifyId: string): Promise<void> {
    const clientToken = await this.getSpotifyClientToken();
    this.logger.log(`Sending Spotify play command for track ${spotifyId}`);
    let response = await this.spotifyClientRequest("https://api.spotify.com/v1/me/player/play", {
      method: "PUT",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        uris: [`spotify:track:${spotifyId}`],
      }),
    });

    if (!response.ok) {
      let errorBody = await response.text();
      let reason = this.extractSpotifyErrorReason(errorBody);

      if (reason === "NO_ACTIVE_DEVICE") {
        const activatedDevice = await this.activateFirstAvailableSpotifyDevice();
        if (activatedDevice) {
          this.logger.log(`Activated Spotify device: ${activatedDevice.name}`);

          response = await this.spotifyClientRequest(
            "https://api.spotify.com/v1/me/player/play",
            {
              method: "PUT",
              headers: {
                "Content-Type": "application/json",
              },
              body: JSON.stringify({
                uris: [`spotify:track:${spotifyId}`],
              }),
            },
          );

          if (response.ok) {
            this.logger.log(`Spotify playback started after device activation for track ${spotifyId}`);
            return;
          }

          errorBody = await response.text();
          reason = this.extractSpotifyErrorReason(errorBody);
        } else {
          throw new Error(
            "Failed to start Spotify playback: no active device and no available Spotify clients were found. Open Spotify on a device and try again.",
          );
        }
      }

      if (reason === "PREMIUM_REQUIRED") {
        const profile = await this.getSpotifyClientProfile(clientToken);
        const accountId = profile?.id || "unknown";
        const product = profile?.product || "unknown";
        throw new Error(
          `Failed to start Spotify playback (${response.status} PREMIUM_REQUIRED). Token account=${accountId}, product=${product}. Make sure SPOTIFY_REFRESH_TOKEN belongs to a premium account.`,
        );
      }

      throw new Error(
        `Failed to start Spotify playback (${response.status}): ${errorBody}`,
      );
    }

    this.logger.log(`Spotify playback started for track ${spotifyId}`);
  }

  async searchSongs(query: string): Promise<any[]> {
    if (!query || query.trim().length < 2) {
      return [];
    }

    const token = await this.getSpotifyToken();

    const response = await fetch(
      `https://api.spotify.com/v1/search?q=${encodeURIComponent(query)}&type=track&limit=5`,
      {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      },
    );

    if (!response.ok) {
      throw new Error(`Spotify search failed: ${response.statusText}`);
    }

    const data: SpotifySearchResponse = await response.json();

    return data.tracks.items.map((track) => ({
      spotifyId: track.id,
      name: track.name,
      artist: track.artists.map((a) => a.name).join(", "),
      album: track.album.name,
      albumArt: track.album.images[0]?.url || null,
      previewUrl: track.preview_url,
    }));
  }

  async create(createSongDto: CreateSongDto): Promise<Song> {
    const person = await this.personRepository.findOne({
      where: { id: createSongDto.personId },
    });

    if (!person) {
      throw new NotFoundException("Person not found");
    }

    const songsByPersonCount = await this.songRepository.count({
      where: { person: { id: createSongDto.personId } },
    });

    // Create new song
    const song = this.songRepository.create({
      ...createSongDto,
      person,
      order: songsByPersonCount + 1,
    });

    return this.songRepository.save(song);
  }

  async findByPerson(personId: string): Promise<Song[] | null> {
    return this.songRepository.find({
      where: { person: { id: personId } },
      relations: ["person"],
      order: { order: "ASC" },
    });
  }

  async findAll(): Promise<Song[]> {
    return this.songRepository.find({
      relations: ["person"],
      order: { createdAt: "DESC" },
    });
  }

  async findNextPending(eventId: string): Promise<{
    id: string;
    spotifyId: string;
    name: string;
    artist: string;
    album: string;
    albumArt: string;
    previewUrl: string;
    createdAt: Date;
  } | null> {
    const song = await this.songRepository.findOne({
      where: { allowed: IsNull(), person: { eventId } },
      relations: ["person"],
      order: { order: "ASC", createdAt: "ASC" },
    });

    if (!song) {
      return null;
    }

    return {
      id: song.id,
      spotifyId: song.spotifyId,
      name: song.name,
      artist: song.artist,
      album: song.album,
      albumArt: song.albumArt,
      previewUrl: song.previewUrl,
      createdAt: song.createdAt,
    };
  }

  async updateAllowed(id: string, allowed: boolean): Promise<Song> {
    if (typeof allowed !== "boolean") {
      throw new BadRequestException("allowed must be a boolean");
    }

    const song = await this.songRepository.findOne({ where: { id } });
    if (!song) {
      throw new NotFoundException("Song not found");
    }

    song.allowed = allowed;

    const allowedSongsCount = await this.songRepository.count({
      where: { personId: song.personId, allowed: true },
    });

    song.allowedOrder = allowed ? allowedSongsCount + 1 : null;

    return this.songRepository.save(song);
  }

  async remove(id: string): Promise<void> {
    const song = await this.songRepository.findOne({ where: { id } });
    if (!song) {
      throw new NotFoundException("Song not found");
    }
    await this.songRepository.remove(song);
  }

  async findNextToPlay(eventId: string): Promise<Song | null> {
    const song = await this.songRepository.findOne({
      where: { allowed: true, playedAt: IsNull(), person: { eventId } },
      relations: ["person"],
      order: { allowedOrder: "ASC", createdAt: "ASC" },
    });

    if (!song) {
      this.logger.debug(`No next approved song found for eventId=${eventId}`);
      return null;
    }

    if (!song.spotifyId) {
      throw new BadRequestException("Song is missing spotifyId");
    }

    song.playedAt = new Date();
    await this.songRepository.save(song);

    this.logger.debug(`Reserved next song ${song.id} (${song.spotifyId}) for playback`);

    return song;
  }
}
