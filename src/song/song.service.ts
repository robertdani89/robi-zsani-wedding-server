import { Injectable, NotFoundException } from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import { Repository } from "typeorm";
import { Song } from "./song.entity";
import { CreateSongDto } from "./dto/create-song.dto";
import { Guest } from "../guest/guest.entity";

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

@Injectable()
export class SongService {
  private spotifyToken: string | null = null;
  private tokenExpiry: number = 0;

  constructor(
    @InjectRepository(Song)
    private songRepository: Repository<Song>,
    @InjectRepository(Guest)
    private guestRepository: Repository<Guest>,
  ) {}

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

  async searchSongs(query: string): Promise<any[]> {
    if (!query || query.trim().length < 2) {
      return [];
    }

    const token = await this.getSpotifyToken();

    const response = await fetch(
      `https://api.spotify.com/v1/search?q=${encodeURIComponent(query)}&type=track&limit=20`,
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
    const guest = await this.guestRepository.findOne({
      where: { id: createSongDto.guestId },
    });

    if (!guest) {
      throw new NotFoundException("Guest not found");
    }

    // Check if guest already has a song selected, update it
    const existingSong = await this.songRepository.findOne({
      where: { guest: { id: guest.id } },
    });

    if (existingSong) {
      // Update existing song
      existingSong.spotifyId = createSongDto.spotifyId;
      existingSong.name = createSongDto.name;
      existingSong.artist = createSongDto.artist;
      existingSong.album = createSongDto.album;
      existingSong.albumArt = createSongDto.albumArt;
      existingSong.previewUrl = createSongDto.previewUrl;
      return this.songRepository.save(existingSong);
    }

    // Create new song
    const song = this.songRepository.create({
      ...createSongDto,
      guest,
    });

    return this.songRepository.save(song);
  }

  async findByGuest(guestId: string): Promise<Song | null> {
    return this.songRepository.findOne({
      where: { guest: { id: guestId } },
      relations: ["guest"],
    });
  }

  async findAll(): Promise<Song[]> {
    return this.songRepository.find({
      relations: ["guest"],
      order: { createdAt: "DESC" },
    });
  }

  async remove(id: string): Promise<void> {
    const song = await this.songRepository.findOne({ where: { id } });
    if (!song) {
      throw new NotFoundException("Song not found");
    }
    await this.songRepository.remove(song);
  }
}
