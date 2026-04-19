import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import axios from 'axios';
import * as songstats from '../services/songstats';

vi.mock('axios');

describe('songstats.isConfigured', () => {
  const originalEnv = process.env;

  beforeEach(() => {
    process.env = { ...originalEnv };
  });

  afterEach(() => {
    process.env = originalEnv;
    vi.clearAllMocks();
  });

  it('should return true when RAPIDAPI_KEY is set', () => {
    process.env.RAPIDAPI_KEY = 'test_api_key';
    
    expect(songstats.isConfigured()).toBe(true);
  });

  it('should return false when RAPIDAPI_KEY is not set', () => {
    delete process.env.RAPIDAPI_KEY;
    
    expect(songstats.isConfigured()).toBe(false);
  });

  it('should return false when RAPIDAPI_KEY is empty string', () => {
    process.env.RAPIDAPI_KEY = '';
    
    expect(songstats.isConfigured()).toBe(false);
  });
});

describe('songstats API functions', () => {
  const originalEnv = process.env;

  beforeEach(() => {
    process.env = { ...originalEnv };
    process.env.RAPIDAPI_KEY = 'test_api_key';
  });

  afterEach(() => {
    process.env = originalEnv;
    vi.clearAllMocks();
  });

  it('searchBySpotifyId should return null when RAPIDAPI_KEY is not configured', async () => {
    delete process.env.RAPIDAPI_KEY;
    
    // The function catches the error and returns null
    const result = await songstats.searchBySpotifyId('test_spotify_id');
    expect(result).toBeNull();
  });

  it('searchBySpotifyId should return track info on successful API call', async () => {
    const mockTrackData = {
      isrc: 'USUG10000423',
      title: 'Test Song',
      artists: [{ name: 'Test Artist' }],
      album: { name: 'Test Album', image: 'https://example.com/album.jpg' },
      spotify_track_id: 'test_spotify_id',
      apple_music_track_id: 'test_apple_id',
      stats: {
        spotify: {
          streams: 1000000,
          popularity: 80,
        },
      },
    };

    vi.mocked(axios.get).mockResolvedValueOnce({ data: mockTrackData });

    const result = await songstats.searchBySpotifyId('test_spotify_id');

    expect(result).not.toBeNull();
    expect(result?.title).toBe('Test Song');
    expect(result?.artist).toBe('Test Artist');
    expect(result?.album).toBe('Test Album');
    expect(result?.spotifyId).toBe('test_spotify_id');
    expect(result?.stats?.spotify?.streams).toBe(1000000);
  });

  it('searchBySpotifyId should return null on API error', async () => {
    vi.mocked(axios.get).mockRejectedValueOnce(new Error('Network error'));

    const result = await songstats.searchBySpotifyId('test_spotify_id');

    expect(result).toBeNull();
  });

  it('searchBySpotifyId should return null when API returns error', async () => {
    vi.mocked(axios.get).mockResolvedValueOnce({ data: { error: 'Track not found' } });

    const result = await songstats.searchBySpotifyId('invalid_spotify_id');

    expect(result).toBeNull();
  });

  it('searchByIsrc should return track info on successful API call', async () => {
    const mockTrackData = {
      isrc: 'USUG10000423',
      title: 'ISRC Song',
      artists: [{ name: 'ISRC Artist' }],
      album: { name: 'ISRC Album', image: 'https://example.com/isrc_album.jpg' },
      spotify_track_id: 'spotify_from_isrc',
      apple_music_track_id: 'apple_from_isrc',
      stats: {
        spotify: {
          streams: 500000,
          popularity: 65,
        },
      },
    };

    vi.mocked(axios.get).mockResolvedValueOnce({ data: mockTrackData });

    const result = await songstats.searchByIsrc('USUG10000423');

    expect(result).not.toBeNull();
    expect(result?.title).toBe('ISRC Song');
    expect(result?.artist).toBe('ISRC Artist');
    expect(result?.isrc).toBe('USUG10000423');
  });

  it('searchByIsrc should return null when RAPIDAPI_KEY is not configured', async () => {
    delete process.env.RAPIDAPI_KEY;
    
    const result = await songstats.searchByIsrc('USUG10000423');
    expect(result).toBeNull();
  });

  it('searchByIsrc should return null on API error', async () => {
    vi.mocked(axios.get).mockRejectedValueOnce(new Error('Network error'));

    const result = await songstats.searchByIsrc('USUG10000423');

    expect(result).toBeNull();
  });

  it('getArtistInfo should return artist data on successful API call', async () => {
    const mockArtistData = {
      id: 'artist_123',
      name: 'Test Artist',
      spotify_id: 'spotify_artist_id',
    };

    vi.mocked(axios.get).mockResolvedValueOnce({ data: mockArtistData });

    const result = await songstats.getArtistInfo('spotify_artist_id');

    expect(result).not.toBeNull();
    expect(result?.name).toBe('Test Artist');
  });

  it('getArtistInfo should return null on API error', async () => {
    vi.mocked(axios.get).mockRejectedValueOnce(new Error('Network error'));

    const result = await songstats.getArtistInfo('spotify_artist_id');

    expect(result).toBeNull();
  });

  it('getTrackStats should return track stats on successful API call', async () => {
    const mockStatsData = {
      isrc: 'USUG10000423',
      stats: {
        spotify: {
          streams: 1000000,
          popularity: 80,
        },
      },
    };

    vi.mocked(axios.get).mockResolvedValueOnce({ data: mockStatsData });

    const result = await songstats.getTrackStats('USUG10000423');

    expect(result).not.toBeNull();
    expect(result?.stats?.spotify?.streams).toBe(1000000);
  });

  it('getTrackStats should return null on API error', async () => {
    vi.mocked(axios.get).mockRejectedValueOnce(new Error('Network error'));

    const result = await songstats.getTrackStats('USUG10000423');

    expect(result).toBeNull();
  });

  it('getTrackHistory should return track history on successful API call', async () => {
    const mockHistoryData = {
      isrc: 'USUG10000423',
      history: [
        { date: '2024-01-01', streams: 1000 },
        { date: '2024-01-02', streams: 1500 },
      ],
    };

    vi.mocked(axios.get).mockResolvedValueOnce({ data: mockHistoryData });

    const result = await songstats.getTrackHistory('USUG10000423');

    expect(result).not.toBeNull();
    expect(result?.history).toHaveLength(2);
  });

  it('getTrackHistory should return null on API error', async () => {
    vi.mocked(axios.get).mockRejectedValueOnce(new Error('Network error'));

    const result = await songstats.getTrackHistory('USUG10000423');

    expect(result).toBeNull();
  });

  it('getTrackPlaylists should return track playlists on successful API call', async () => {
    const mockPlaylistsData = {
      isrc: 'USUG10000423',
      playlists: [
        { name: 'Top Hits', spotify_id: 'playlist_1' },
        { name: 'Rock Classics', spotify_id: 'playlist_2' },
      ],
    };

    vi.mocked(axios.get).mockResolvedValueOnce({ data: mockPlaylistsData });

    const result = await songstats.getTrackPlaylists('USUG10000423');

    expect(result).not.toBeNull();
    expect(result?.playlists).toHaveLength(2);
  });

  it('getTrackPlaylists should return null on API error', async () => {
    vi.mocked(axios.get).mockRejectedValueOnce(new Error('Network error'));

    const result = await songstats.getTrackPlaylists('USUG10000423');

    expect(result).toBeNull();
  });
});
