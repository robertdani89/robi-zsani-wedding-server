import {
  BadRequestException,
  Injectable,
  NotFoundException,
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

@Injectable()
export class SongService {
  private spotifyToken: string | null = null;
  private tokenExpiry: number = 0;

  constructor(
    @InjectRepository(Song)
    private songRepository: Repository<Song>,
    @InjectRepository(Person)
    private personRepository: Repository<Person>,
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

    // Create new song
    const song = this.songRepository.create({
      ...createSongDto,
      person,
    });

    return this.songRepository.save(song);
  }

  async findByPerson(personId: string): Promise<Song[] | null> {
    return this.songRepository.find({
      where: { person: { id: personId } },
      relations: ["person"],
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
      order: { createdAt: "ASC" },
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
    return this.songRepository.save(song);
  }

  async remove(id: string): Promise<void> {
    const song = await this.songRepository.findOne({ where: { id } });
    if (!song) {
      throw new NotFoundException("Song not found");
    }
    await this.songRepository.remove(song);
  }
}
