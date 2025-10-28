// context/PlayerContext.jsx
// context/PlayerContext.jsx - Update the import line at the top
import React, {
  createContext,
  useContext,
  useEffect,
  useRef,
  useState,
  useCallback,
  useMemo,
} from "react";
import axios from "axios";
import { useToast } from "./ThemeContext";
import { useAuth } from "./AuthContext";
// Import sample data for fallback
import { sampleSongs, sampleAlbums } from '../data/sampleData';

export const PlayerContext = createContext();

const PlayerContextProvider = (props) => {
  const audioRef = useRef();
  const seekBg = useRef();
  const seekBar = useRef();
  const { isAuthenticated } = useAuth();

  const url = import.meta.env.VITE_API_URL || "http://localhost:4000";

  // Core data states
  const [songsData, setSongsData] = useState([]);
  const [albumsData, setAlbumsData] = useState([]);
  const [playlists, setPlaylists] = useState([]);
  // Load data from backend or fallback to sample data
  useEffect(() => {
    const fetchData = async () => {
      try {
        // Try to fetch from backend with timeout
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 5000); // 5 second timeout
        
        const [songsRes, albumsRes, playlistsRes] = await Promise.all([
          axios.get(`${url}/api/song/list`, { signal: controller.signal }).catch(() => ({ data: [] })),
          axios.get(`${url}/api/album/list`, { signal: controller.signal }).catch(() => ({ data: [] })),
          axios.get(`${url}/api/playlist/list`, { signal: controller.signal }).catch(() => ({ data: [] })),
        ]);
        
        clearTimeout(timeoutId);
        
        // Debug backend responses
        console.log('Backend songs response structure:', Object.keys(songsRes.data || {}));
        console.log('Backend albums response structure:', Object.keys(albumsRes.data || {}));
        console.log('Backend playlists response structure:', Object.keys(playlistsRes.data || {}));
        
        // Use backend data if available, otherwise use sample data
        // Handle different backend response structures
        const finalSongs = Array.isArray(songsRes.data?.data) && songsRes.data.data.length > 0 ? songsRes.data.data : 
                          Array.isArray(songsRes.data) && songsRes.data.length > 0 ? songsRes.data : sampleSongs;
        
        const finalAlbums = Array.isArray(albumsRes.data?.allAlbums) && albumsRes.data.allAlbums.length > 0 ? albumsRes.data.allAlbums :
                           Array.isArray(albumsRes.data) && albumsRes.data.length > 0 ? albumsRes.data : sampleAlbums;
        
        const finalPlaylists = Array.isArray(playlistsRes.data?.playlists) && playlistsRes.data.playlists.length > 0 ? playlistsRes.data.playlists :
                              Array.isArray(playlistsRes.data) && playlistsRes.data.length > 0 ? playlistsRes.data : [];
        
        console.log('Data loaded - Songs:', finalSongs.length, 'Albums:', finalAlbums.length, 'Playlists:', finalPlaylists.length);
        
        setSongsData(finalSongs);
        setAlbumsData(finalAlbums);
        setPlaylists(finalPlaylists);
        
      } catch (err) {
        console.log('Backend not available, using sample data:', err.message);
        // Use sample data as fallback
        setSongsData(sampleSongs);
        setAlbumsData(sampleAlbums);
        setPlaylists([]);
      }
    };
    fetchData();
  }, []);
  
  const [showPlaylistModal, setShowPlaylistModal] = useState(false);

  // Player state
  const [track, setTrack] = useState(null);
  const [playStatus, setPlayStatus] = useState(false);
  const [time, setTime] = useState({
    currentTime: { second: 0, minute: 0 },
    totalTime: { second: 0, minute: 0 },
  });

  // Features state
  const [isShuffled, setIsShuffled] = useState(false);
  const [isRepeating, setIsRepeating] = useState(false);
  const [volume, setVolume] = useState(80);
  const [currentPlaylist, setCurrentPlaylist] = useState([]);
  const [currentPlaylistIndex, setCurrentPlaylistIndex] = useState(0);

  // User data
  const [likedSongs, setLikedSongs] = useState([]);
  const [recentlyPlayed, setRecentlyPlayed] = useState([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [searchResults, setSearchResults] = useState({
    songs: [],
    albums: [],
    playlists: [],
  });

  // Safe data getters
  const getSafeSongsData = () => (Array.isArray(songsData) ? songsData : []);
  const getSafeAlbumsData = () => (Array.isArray(albumsData) ? albumsData : []);
  const getSafePlaylists = () => (Array.isArray(playlists) ? playlists : []);
  const getSafeLikedSongs = () => (Array.isArray(likedSongs) ? likedSongs : []);
  const getSafeRecentlyPlayed = () =>
    Array.isArray(recentlyPlayed) ? recentlyPlayed : [];

  // Load data from localStorage - only if not authenticated (use backend data when logged in)
  useEffect(() => {
    if (!isAuthenticated) {
      try {
        const savedLikedSongs = localStorage.getItem("likedSongs");
        const savedRecentlyPlayed = localStorage.getItem("recentlyPlayed");
        const savedVolume = localStorage.getItem("volume");

        if (savedLikedSongs) setLikedSongs(JSON.parse(savedLikedSongs));
        if (savedRecentlyPlayed)
          setRecentlyPlayed(JSON.parse(savedRecentlyPlayed));
        if (savedVolume) setVolume(parseInt(savedVolume));
      } catch (error) {
        console.error("Error loading from localStorage:", error);
      }
    }
  }, [isAuthenticated]);

  // Save to localStorage - only for non-authenticated users
  useEffect(() => {
    if (!isAuthenticated) {
      localStorage.setItem("likedSongs", JSON.stringify(getSafeLikedSongs()));
    }
  }, [likedSongs, isAuthenticated]);

  useEffect(() => {
    if (!isAuthenticated) {
      localStorage.setItem(
        "recentlyPlayed",
        JSON.stringify(getSafeRecentlyPlayed())
      );
    }
  }, [recentlyPlayed, isAuthenticated]);

  useEffect(() => {
    localStorage.setItem("volume", volume.toString());
  }, [volume]);

  // Add to recently played
  const addToRecentlyPlayed = useCallback(async (song) => {
    if (!song?._id) return;

    // Optimistic update - update UI immediately
    setRecentlyPlayed((prev) => {
      const safePrev = Array.isArray(prev) ? prev : [];
      // Remove any existing entry for this song
      const filtered = safePrev.filter((item) => item && item._id !== song._id);
      // Add playedAt timestamp to the song copy (matches backend format)
      const songWithTime = { ...song, playedAt: new Date().toISOString() };
      // Keep most recent first and cap to 5 entries
      return [songWithTime, ...filtered].slice(0, 5);
    });

    try {
      // Update backend
      const response = await axios.post(`${url}/api/song/recently-played`, { songId: song._id });
      
      if (!response.data.success) {
        // Revert optimistic update on failure
        setRecentlyPlayed((prev) => {
          const safePrev = Array.isArray(prev) ? prev : [];
          // Remove the song we just added
          return safePrev.filter((item) => item && item._id !== song._id);
        });
      }
    } catch (error) {
      console.error("Error adding to recently played:", error);
      // Revert optimistic update on error
      setRecentlyPlayed((prev) => {
        const safePrev = Array.isArray(prev) ? prev : [];
        // Remove the song we just added
        return safePrev.filter((item) => item && item._id !== song._id);
      });
    }
  }, []);

  // Use ThemeContext's toast when available
  let themeToast;
  try {
    themeToast = useToast();
  } catch (e) {
    themeToast = null;
  }

  const showToast = useCallback((message, type = "info") => {
    if (themeToast && typeof themeToast.showToast === 'function') {
      themeToast.showToast(message, type);
    } else {
      console.log(`[${type.toUpperCase()}]: ${message}`);
    }
  }, [themeToast]);

  // Player controls
  const play = useCallback(() => {
    if (audioRef.current && track) {
      audioRef.current.volume = volume / 100;
      audioRef.current.play().catch((error) => {
        console.error("Play error:", error);
        showToast("Failed to play song", "error");
      });
      setPlayStatus(true);
    }
  }, [track, volume, showToast]);

  const pause = useCallback(() => {
    if (audioRef.current) {
      audioRef.current.pause();
      setPlayStatus(false);
    }
  }, []);

  const togglePlay = useCallback(() => {
    if (playStatus) {
      pause();
    } else {
      play();
    }
  }, [playStatus, play, pause]);

  const playWithId = useCallback(
    // Play a song by ID, set audio src and play
    (id, playlist = null) => {
      if (!id) {
        showToast("No song selected", "error");
        return;
      }
      
      const safeSongs = getSafeSongsData();
      const song = safeSongs.find((item) => item?._id === id);
      
      if (!song) {
        showToast("Song not found", "error");
        return;
      }
      
      if (!song.file) {
        showToast("Song file not available", "error");
        return;
      }
      
      try {
        setTrack(song);
        addToRecentlyPlayed(song);
        const safePlaylist = Array.isArray(playlist) ? playlist : safeSongs;
        setCurrentPlaylist(safePlaylist);
        const songIndex = safePlaylist.findIndex((item) => item?._id === id);
        setCurrentPlaylistIndex(songIndex >= 0 ? songIndex : 0);
        
        if (audioRef.current) {
          // Stop current playback
          audioRef.current.pause();
          audioRef.current.currentTime = 0;
          
          // Set new source
          audioRef.current.src = song.file;
          audioRef.current.load();
          
          // Wait for audio to be ready
          const handleCanPlay = () => {
            audioRef.current.removeEventListener('canplay', handleCanPlay);
            audioRef.current.play().then(() => {
              setPlayStatus(true);
              showToast(`Now playing: ${song.name}`, "success");
            }).catch((error) => {
              console.error("Play error:", error);
              showToast("Failed to play song. Please try again.", "error");
              setPlayStatus(false);
            });
          };
          
          const handleError = () => {
            audioRef.current.removeEventListener('error', handleError);
            console.error("Audio load error for:", song.file);
            showToast("Failed to load song. Please try another song.", "error");
            setPlayStatus(false);
          };
          
          audioRef.current.addEventListener('canplay', handleCanPlay);
          audioRef.current.addEventListener('error', handleError);
          
          // Fallback timeout
          setTimeout(() => {
            if (!playStatus) {
              audioRef.current.removeEventListener('canplay', handleCanPlay);
              audioRef.current.removeEventListener('error', handleError);
              showToast("Song is taking too long to load. Please try again.", "error");
            }
          }, 10000);
        }
      } catch (error) {
        console.error("Error in playWithId:", error);
        showToast("Failed to play song", "error");
      }
    },
    [getSafeSongsData, addToRecentlyPlayed, showToast, playStatus]
  );

  // Enhanced playlist playback function
  const playPlaylist = useCallback(
    (playlistId) => {
      const playlist = playlists.find(p => p._id === playlistId);
      if (!playlist || !playlist.songs || playlist.songs.length === 0) {
        showToast("Playlist is empty or not found", "error");
        return;
      }

      // Start playing the first song in the playlist
      const firstSong = playlist.songs[0];
      if (firstSong) {
        playWithId(firstSong._id, playlist.songs);
        showToast(`Playing playlist: ${playlist.name}`, "success");
      }
    },
    [playlists, playWithId, showToast]
  );

  const next = useCallback(() => {
    const safePlaylist = Array.isArray(currentPlaylist) ? currentPlaylist : [];
    if (safePlaylist.length === 0) return;

    let nextIndex;
    if (isShuffled) {
      nextIndex = Math.floor(Math.random() * safePlaylist.length);
    } else {
      nextIndex = (currentPlaylistIndex + 1) % safePlaylist.length;
    }

    const nextSong = safePlaylist[nextIndex];
    if (nextSong) {
      setCurrentPlaylistIndex(nextIndex);
      setTrack(nextSong);
      addToRecentlyPlayed(nextSong);

      setTimeout(() => {
        if (audioRef.current) {
          audioRef.current.currentTime = 0;
          play();
        }
      }, 100);
    }
  }, [
    currentPlaylist,
    currentPlaylistIndex,
    isShuffled,
    addToRecentlyPlayed,
    play,
  ]);

  const previous = useCallback(() => {
    const safePlaylist = Array.isArray(currentPlaylist) ? currentPlaylist : [];
    if (safePlaylist.length === 0) return;

    const prevIndex =
      currentPlaylistIndex > 0
        ? currentPlaylistIndex - 1
        : safePlaylist.length - 1;
    const prevSong = safePlaylist[prevIndex];

    if (prevSong) {
      setCurrentPlaylistIndex(prevIndex);
      setTrack(prevSong);
      addToRecentlyPlayed(prevSong);

      setTimeout(() => {
        if (audioRef.current) {
          audioRef.current.currentTime = 0;
          play();
        }
      }, 100);
    }
  }, [currentPlaylist, currentPlaylistIndex, addToRecentlyPlayed, play]);

  const seekSong = useCallback((e) => {
    if (audioRef.current && seekBg.current) {
      const rect = seekBg.current.getBoundingClientRect();
      const percent = (e.clientX - rect.left) / rect.width;
      const seekTime = percent * audioRef.current.duration;
      audioRef.current.currentTime = seekTime;
    }
  }, []);

  const toggleShuffle = useCallback(() => {
    setIsShuffled((prev) => !prev);
    showToast(isShuffled ? "Shuffle disabled" : "Shuffle enabled", "info");
  }, [isShuffled, showToast]);

  const toggleRepeat = useCallback(() => {
    setIsRepeating((prev) => !prev);
    showToast(isRepeating ? "Repeat disabled" : "Repeat enabled", "info");
  }, [isRepeating, showToast]);

  const handleVolumeChange = useCallback((newVolume) => {
    setVolume(newVolume);
    if (audioRef.current) {
      audioRef.current.volume = newVolume / 100;
    }
  }, []);

  // Like/Unlike functionality
  const toggleLikeSong = useCallback(
    async (songId) => {
      if (!songId) {
        showToast("Invalid song ID", "error");
        return;
      }
      
      const currentLikedSongs = getSafeLikedSongs();
      const safeSongs = getSafeSongsData();
      const song = safeSongs.find(s => s._id === songId);
      
      if (!song) {
        showToast("Song not found", "error");
        return;
      }
      
      const isCurrentlyLiked = currentLikedSongs.some(likedSong => 
        typeof likedSong === 'string' ? likedSong === songId : likedSong._id === songId
      );
      
      // Optimistic update - update UI immediately
      if (isCurrentlyLiked) {
        // Unlike the song
        const updatedLikedSongs = currentLikedSongs.filter(likedSong => 
          typeof likedSong === 'string' ? likedSong !== songId : likedSong._id !== songId
        );
        setLikedSongs(updatedLikedSongs);
        showToast(`Removed "${song.name}" from liked songs`, "info");
      } else {
        // Like the song
        const updatedLikedSongs = [...currentLikedSongs, song];
        setLikedSongs(updatedLikedSongs);
        showToast(`Added "${song.name}" to liked songs`, "success");
      }
      
      try {
        let response;
        if (isCurrentlyLiked) {
          // Unlike the song
          response = await axios.post(`${url}/api/song/unlike`, { songId });
        } else {
          // Like the song
          response = await axios.post(`${url}/api/song/like`, { songId });
        }
        
        if (!response.data.success) {
          // Revert optimistic update on failure
          setLikedSongs(currentLikedSongs);
          showToast(response.data.message || "Failed to update liked songs", "error");
        }
      } catch (error) {
        console.error("Error toggling like:", error);
        // Revert optimistic update on error
        setLikedSongs(currentLikedSongs);
        showToast("Failed to update liked songs", "error");
      }
    },
    [getSafeLikedSongs, getSafeSongsData, showToast]
  );

  const isSongLiked = useCallback((songId) => {
    const likedSongs = getSafeLikedSongs();
    return likedSongs.some(likedSong => 
      typeof likedSong === 'string' ? likedSong === songId : likedSong._id === songId
    );
  }, [getSafeLikedSongs]);

  // Search functionality
  const performSearch = useCallback((query) => {
    const qRaw = typeof query === 'string' ? query : '';
    const q = qRaw.trim();
    
    console.log('Search query:', q, 'Available songs:', getSafeSongsData().length);
    
    if (!q) {
      setSearchResults({ songs: [], albums: [], playlists: [] });
      return;
    }

    // Normalization helper (removes accents and lowercases)
    const normalize = (str) => {
      try {
        return (str || '')
          .toString()
          .normalize('NFD')
          .replace(/\p{Diacritic}/gu, '')
          .toLowerCase();
      } catch (_e) {
        return (str || '').toString().toLowerCase();
      }
    };

    const needle = normalize(q);
    const safeSongs = getSafeSongsData();
    const safeAlbums = getSafeAlbumsData();
    const safePlaylists = getSafePlaylists();

    // Match songs by common string fields (be generous to backend shape)
    const matchedSongs = safeSongs.filter((song) => {
      const hayParts = [
        song?.name,
        song?.title,
        song?.desc,
        song?.description,
        song?.album,
        song?.artist,
        Array.isArray(song?.artists) ? song.artists.join(' ') : undefined
      ];
      const hay = normalize(hayParts.filter(Boolean).join(' '));
      return hay.includes(needle);
    });

    const matchedAlbums = safeAlbums.filter((album) => {
      const hayParts = [album?.name, album?.title, album?.desc, album?.artist];
      const hay = normalize(hayParts.filter(Boolean).join(' '));
      return hay.includes(needle);
    });

    const matchedPlaylists = safePlaylists.filter((playlist) => {
      const hayParts = [playlist?.name, playlist?.title, playlist?.desc, playlist?.description];
      const hay = normalize(hayParts.filter(Boolean).join(' '));
      return hay.includes(needle);
    });

    console.log('Search results - Songs:', matchedSongs.length, 'Albums:', matchedAlbums.length, 'Playlists:', matchedPlaylists.length);
    
    setSearchResults({ songs: matchedSongs, albums: matchedAlbums, playlists: matchedPlaylists });
  }, [songsData, albumsData, playlists]);

  // Debounced search: when `searchQuery` changes, run performSearch after a short pause
  useEffect(() => {
    const q = typeof searchQuery === 'string' ? searchQuery.trim() : '';
    // immediate clear
    if (!q) {
      setSearchResults({ songs: [], albums: [], playlists: [] });
      return;
    }

    const id = setTimeout(() => {
      performSearch(q);
    }, 220);

    return () => clearTimeout(id);
  }, [searchQuery]);

  // Playlist management
  const createPlaylist = useCallback(
    async (name) => {
      if (!name?.trim()) {
        showToast("Playlist name is required", "error");
        return { success: false };
      }

      try {
        const response = await axios.post(`${url}/api/playlist/create`, {
          name: name.trim(),
          description: "My playlist",
        });

        if (response.data.success) {
          await getPlaylistsData();
          showToast("Playlist created successfully", "success");
          return { success: true };
        } else {
          showToast(
            response.data.message || "Failed to create playlist",
            "error"
          );
          return { success: false };
        }
      } catch (error) {
        console.error("Error creating playlist:", error);
        const message =
          error.response?.data?.message || "Failed to create playlist";
        showToast(message, "error");
        return { success: false, message };
      }
    },
    [showToast]
  );

  const deletePlaylist = useCallback(
    async (playlistId) => {
      if (!playlistId) {
        showToast("Invalid playlist ID", "error");
        return { success: false };
      }

      // Check if this is a sample playlist (IDs like 'p1', 'p2', etc.)
      if (playlistId.startsWith('p') && playlistId.length <= 3) {
        showToast("Sample playlists cannot be deleted. Please log in to create and manage your own playlists.", "info");
        return { success: false };
      }

      // Check if user is authenticated
      if (!isAuthenticated) {
        showToast("Please log in to delete playlists", "error");
        return { success: false };
      }

      try {
        const response = await axios.delete(
          `${url}/api/playlist/delete/${playlistId}`
        );

        if (response.data.success) {
          await getPlaylistsData();
          showToast("Playlist deleted successfully", "success");
          return { success: true };
        } else {
          showToast(
            response.data.message || "Failed to delete playlist",
            "error"
          );
          return { success: false };
        }
      } catch (error) {
        console.error("Error deleting playlist:", error);
        const message =
          error.response?.data?.message || "Failed to delete playlist";
        showToast(message, "error");
        return { success: false, message };
      }
    },
    [showToast, isAuthenticated]
  );

  const addSongToPlaylist = useCallback(
    async (playlistId, songId) => {
      if (!playlistId || !songId) {
        showToast("Invalid playlist or song ID", "error");
        return { success: false };
      }

      // Check if this is a sample playlist
      if (playlistId.startsWith('p') && playlistId.length <= 3) {
        showToast("Sample playlists cannot be modified. Please log in to create your own playlists.", "info");
        return { success: false };
      }

      // Check if user is authenticated
      if (!isAuthenticated) {
        showToast("Please log in to add songs to playlists", "error");
        return { success: false };
      }

      try {
        // Find the song to add
        const songToAdd = songsData.find(song => song._id === songId);
        if (!songToAdd) {
          showToast("Song not found", "error");
          return { success: false };
        }

        // Optimistically update the local state first for instant UI update
        setPlaylists(prevPlaylists => 
          prevPlaylists.map(playlist => {
            if (playlist._id === playlistId) {
              // Check if song already exists in playlist
              const songExists = playlist.songs?.some(song => song._id === songId);
              if (songExists) {
                showToast("Song already exists in this playlist", "error");
                return playlist;
              }
              return {
                ...playlist,
                songs: [...(playlist.songs || []), songToAdd]
              };
            }
            return playlist;
          })
        );

        const response = await axios.post(`${url}/api/playlist/add-song`, {
          playlistId,
          songId,
        });

        if (response.data.success) {
          // Refresh from backend to ensure consistency
          try {
            const response = await axios.get(`${url}/api/playlist/list`);
            if (response.data.success) {
              const pls = Array.isArray(response.data.playlists) ? response.data.playlists : [];
              setPlaylists(pls);
            }
          } catch (refreshError) {
            console.error("Error refreshing playlists:", refreshError);
          }
          showToast("Song added to playlist", "success");
          return { success: true };
        } else {
          // Revert optimistic update on failure
          try {
            const response = await axios.get(`${url}/api/playlist/list`);
            if (response.data.success) {
              const pls = Array.isArray(response.data.playlists) ? response.data.playlists : [];
              setPlaylists(pls);
            }
          } catch (refreshError) {
            console.error("Error refreshing playlists:", refreshError);
          }
          showToast(response.data.message || "Failed to add song", "error");
          return { success: false };
        }
      } catch (error) {
        console.error("Error adding song to playlist:", error);
        // Revert optimistic update on error
        try {
          const response = await axios.get(`${url}/api/playlist/list`);
          if (response.data.success) {
            const pls = Array.isArray(response.data.playlists) ? response.data.playlists : [];
            setPlaylists(pls);
          }
        } catch (refreshError) {
          console.error("Error refreshing playlists:", refreshError);
        }
        const message = error.response?.data?.message || "Failed to add song";
        showToast(message, "error");
        return { success: false, message };
      }
    },
    [showToast, songsData, isAuthenticated]
  );

  const removeSongFromPlaylist = useCallback(
    async (playlistId, songId) => {
      if (!playlistId || !songId) {
        showToast("Invalid playlist or song ID", "error");
        return { success: false };
      }

      // Check if this is a sample playlist
      if (playlistId.startsWith('p') && playlistId.length <= 3) {
        showToast("Sample playlists cannot be modified. Please log in to create your own playlists.", "info");
        return { success: false };
      }

      // Check if user is authenticated
      if (!isAuthenticated) {
        showToast("Please log in to remove songs from playlists", "error");
        return { success: false };
      }

      try {
        // Optimistically update the local state first for instant UI update
        setPlaylists(prevPlaylists => 
          prevPlaylists.map(playlist => {
            if (playlist._id === playlistId) {
              return {
                ...playlist,
                songs: playlist.songs?.filter(song => song._id !== songId) || []
              };
            }
            return playlist;
          })
        );

        const response = await axios.post(`${url}/api/playlist/remove-song`, {
          playlistId,
          songId,
        });

        if (response.data.success) {
          // Refresh from backend to ensure consistency
          try {
            const response = await axios.get(`${url}/api/playlist/list`);
            if (response.data.success) {
              const pls = Array.isArray(response.data.playlists) ? response.data.playlists : [];
              setPlaylists(pls);
            }
          } catch (refreshError) {
            console.error("Error refreshing playlists:", refreshError);
          }
          showToast("Song removed from playlist", "success");
          return { success: true };
        } else {
          // Revert optimistic update on failure
          try {
            const response = await axios.get(`${url}/api/playlist/list`);
            if (response.data.success) {
              const pls = Array.isArray(response.data.playlists) ? response.data.playlists : [];
              setPlaylists(pls);
            }
          } catch (refreshError) {
            console.error("Error refreshing playlists:", refreshError);
          }
          showToast(response.data.message || "Failed to remove song", "error");
          return { success: false };
        }
      } catch (error) {
        console.error("Error removing song from playlist:", error);
        // Revert optimistic update on error
        try {
          const response = await axios.get(`${url}/api/playlist/list`);
          if (response.data.success) {
            const pls = Array.isArray(response.data.playlists) ? response.data.playlists : [];
            setPlaylists(pls);
          }
        } catch (refreshError) {
          console.error("Error refreshing playlists:", refreshError);
        }
        const message =
          error.response?.data?.message || "Failed to remove song";
        showToast(message, "error");
        return { success: false, message };
      }
    },
    [showToast, isAuthenticated]
  );

  // Data fetching
  // Data fetching functions to load songs/albums/playlists

  const getSongsData = useCallback(async () => {
    try {
      const response = await axios.get(`${url}/api/song/list`);
      const songs = response.data.success
        ? Array.isArray(response.data.data)
          ? response.data.data
          : []
        : Array.isArray(response.data)
        ? response.data
        : [];

      // If backend returned empty, fallback to local sample data
      if (!songs || songs.length === 0) {
        try {
          const sampleModule = await import('../data/sampleData');
          setSongsData(sampleModule.sampleSongs);
          if (!track && sampleModule.sampleSongs.length > 0) {
            setTrack(sampleModule.sampleSongs[0]);
            setCurrentPlaylist(sampleModule.sampleSongs);
          }
          return;
        } catch (impErr) {
          console.warn('No sample songs available', impErr);
        }
      }

      setSongsData(songs);

      if (songs.length > 0 && !track) {
        setTrack(songs[0]);
        setCurrentPlaylist(songs);
      }
    } catch (error) {
      console.error("Error fetching songs:", error);
      // Fallback to sample data on error
      try {
        const sampleModule = await import('../data/sampleData');
        setSongsData(sampleModule.sampleSongs);
        if (!track && sampleModule.sampleSongs.length > 0) {
          setTrack(sampleModule.sampleSongs[0]);
          setCurrentPlaylist(sampleModule.sampleSongs);
        }
      } catch (impErr) {
        console.error('No sample songs available', impErr);
        setSongsData([]);
      }
    }
  }, [track]);

  const getAlbumsData = useCallback(async () => {
    try {
      const response = await axios.get(`${url}/api/album/list`);
      const albums = Array.isArray(response.data.allAlbums)
        ? response.data.allAlbums
        : Array.isArray(response.data)
        ? response.data
        : [];

      if (!albums || albums.length === 0) {
        try {
          const sampleModule = await import('../data/sampleData');
          setAlbumsData(sampleModule.sampleAlbums);
          return;
        } catch (impErr) {
          console.warn('No sample albums available', impErr);
        }
      }

      setAlbumsData(albums);
    } catch (error) {
      console.error("Error fetching albums:", error);
      try {
        const sampleModule = await import('../data/sampleData');
        setAlbumsData(sampleModule.sampleAlbums);
      } catch (impErr) {
        console.error('No sample albums available', impErr);
        setAlbumsData([]);
      }
    }
  }, []);

  const getPlaylistsData = useCallback(async () => {
    // Only fetch playlists if authenticated
    if (!isAuthenticated) {
      setPlaylists([]);
      return;
    }

    try {
      const response = await axios.get(`${url}/api/playlist/list`);
      if (response.data.success) {
        const pls = Array.isArray(response.data.playlists) ? response.data.playlists : [];
        setPlaylists(pls);
      } else {
        setPlaylists([]);
      }
    } catch (error) {
      console.error("Error fetching playlists:", error);
      setPlaylists([]);
    }
  }, [isAuthenticated]);

  const getLikedSongs = useCallback(async () => {
    try {
      const response = await axios.get(`${url}/api/song/liked`);
      if (response.data.success) {
        const likedSongsData = Array.isArray(response.data.likedSongs)
          ? response.data.likedSongs
          : [];
        setLikedSongs(likedSongsData);
        return;
      }
    } catch (error) {
      console.error("Error fetching liked songs:", error);
    }

    // fallback: no liked songs initially
    setLikedSongs([]);
  }, []);

  const getRecentlyPlayed = useCallback(async () => {
    try {
      const response = await axios.get(`${url}/api/song/recently-played`);
      if (response.data.success) {
        const recentlyPlayedData = Array.isArray(response.data.recentlyPlayed)
          ? response.data.recentlyPlayed
          : [];
        console.log("✅ Recently played loaded:", recentlyPlayedData.length, "songs");
        setRecentlyPlayed(recentlyPlayedData);
        return;
      }
    } catch (error) {
      console.error("Error fetching recently played:", error);
    }

    // fallback: no recently played initially
    setRecentlyPlayed([]);
  }, []);

  // Initialize data on mount and when authentication changes
  useEffect(() => {
    getSongsData();
    getAlbumsData();
    getPlaylistsData();
    
    // Load user-specific data if authenticated
    if (isAuthenticated) {
      getLikedSongs();
      getRecentlyPlayed();
    } else {
      // Clear user data when logged out
      setLikedSongs([]);
      setRecentlyPlayed([]);
    }
  }, [isAuthenticated]); // Run when authentication status changes

  // Audio event handlers
  useEffect(() => {
    const audioElement = audioRef.current;

    const handleEnded = () => {
      if (isRepeating) {
        audioElement.currentTime = 0;
        audioElement.play();
      } else {
        // Auto-advance to next song in playlist
        const safePlaylist = Array.isArray(currentPlaylist) ? currentPlaylist : [];
        if (safePlaylist.length > 0) {
          next();
        } else {
          // If no playlist, just stop
          setPlayStatus(false);
        }
      }
    };

    const handleTimeUpdate = () => {
      if (audioElement && audioElement.duration && seekBar.current) {
        const progress =
          (audioElement.currentTime / audioElement.duration) * 100;
        seekBar.current.style.width = `${progress}%`;

        setTime({
          currentTime: {
            second: Math.floor(audioElement.currentTime % 60)
              .toString()
              .padStart(2, "0"),
            minute: Math.floor(audioElement.currentTime / 60),
          },
          totalTime: {
            second: Math.floor(audioElement.duration % 60)
              .toString()
              .padStart(2, "0"),
            minute: Math.floor(audioElement.duration / 60),
          },
        });
      }
    };

    const handleLoadedMetadata = () => {
      if (audioElement && audioElement.duration) {
        setTime({
          currentTime: {
            second: Math.floor(audioElement.currentTime % 60)
              .toString()
              .padStart(2, "0"),
            minute: Math.floor(audioElement.currentTime / 60),
          },
          totalTime: {
            second: Math.floor(audioElement.duration % 60)
              .toString()
              .padStart(2, "0"),
            minute: Math.floor(audioElement.duration / 60),
          },
        });
      }
    };

    if (audioElement) {
      audioElement.addEventListener("ended", handleEnded);
      audioElement.addEventListener("timeupdate", handleTimeUpdate);
      audioElement.addEventListener("loadedmetadata", handleLoadedMetadata);
      audioElement.volume = volume / 100;
    }

    return () => {
      if (audioElement) {
        audioElement.removeEventListener("ended", handleEnded);
        audioElement.removeEventListener("timeupdate", handleTimeUpdate);
        audioElement.removeEventListener(
          "loadedmetadata",
          handleLoadedMetadata
        );
      }
    };
  }, [isRepeating, next, volume]);

  // Sync audio src when track changes
  useEffect(() => {
    const audioElement = audioRef.current;
    if (!audioElement) return;

    if (track) {
      // Use `file` property from backend, fallback to `url` or `src` fields
      const src = track.file || track.url || track.src || track.audio;
      if (src) {
        audioElement.src = src;
        audioElement.load();
        audioElement.volume = volume / 100;
        setPlayStatus(false);
      }
    } else {
      audioElement.removeAttribute('src');
      audioElement.load();
      setPlayStatus(false);
    }
  }, [track, volume]);

  // Memoized context value to prevent unnecessary re-renders
  const contextValue = useMemo(
    () => ({
      // Refs
      audioRef,
      seekBg,
      seekBar,

      // Player state
      track,
      playStatus,
      time,
      volume,

      // Player controls
      play,
      pause,
      togglePlay,
      playWithId,
      playPlaylist,
      previous,
      next,
      seekSong,
      toggleShuffle,
      toggleRepeat,
      handleVolumeChange,

      // Features state
      isShuffled,
      isRepeating,

      // Data
      songsData: getSafeSongsData(),
      albumsData: getSafeAlbumsData(),
      playlists: getSafePlaylists(),
      likedSongs: getSafeLikedSongs(),
      recentlyPlayed: getSafeRecentlyPlayed(),

      // Search
      searchQuery,
      setSearchQuery,
      searchResults,
      performSearch,

      // Playlist management
      showPlaylistModal,
      setShowPlaylistModal,
      createPlaylist,
      deletePlaylist,
      addSongToPlaylist,
      removeSongFromPlaylist,

      // Like functionality
      toggleLikeSong,
      isSongLiked,

      // Data refreshing
      getPlaylistsData,
    }),
    [
      track,
      playStatus,
      time,
      volume,
      isShuffled,
      isRepeating,
      songsData,
      albumsData,
      playlists,
      likedSongs,
      recentlyPlayed,
      searchQuery,
      searchResults,
      showPlaylistModal,
      play,
      pause,
      togglePlay,
      playWithId,
      previous,
      next,
      seekSong,
      toggleShuffle,
      toggleRepeat,
      handleVolumeChange,
      toggleLikeSong,
      isSongLiked,
      createPlaylist,
      deletePlaylist,
      addSongToPlaylist,
      removeSongFromPlaylist,
      getPlaylistsData,
    ]
  );

  return (
    <PlayerContext.Provider value={contextValue}>
      {/* Hidden audio element controlled by PlayerContext */}
      <audio
        ref={audioRef}
        style={{ display: 'none' }}
        preload="auto"
      />
      {props.children}
    </PlayerContext.Provider>
  );
};
// Make sure this is at the end of your PlayerContext.jsx file, before the default export
export const usePlayer = () => {
  const context = useContext(PlayerContext);
  if (context === undefined) {
    throw new Error('usePlayer must be used within a PlayerContextProvider');
  }
  return context;
};
export default PlayerContextProvider;
