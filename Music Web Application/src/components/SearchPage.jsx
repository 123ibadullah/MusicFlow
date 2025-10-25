import React, { useState, useMemo, useRef, useEffect } from 'react';
import { usePlayer } from '../context/PlayerContext';
import SongItem from './SongItem';
import AlbumItem from './AlbumItem';
import PlaylistItem from './playlistItem';

const SearchPage = () => {
  const { 
    searchQuery, 
    setSearchQuery, 
    performSearch, 
    searchResults, 
    songsData, 
    albumsData,
    playlists,
    playWithId 
  } = usePlayer();
  const [localQuery, setLocalQuery] = useState(searchQuery || '');
  const [activeTab, setActiveTab] = useState('all'); // 'all', 'songs', 'albums', 'playlists'
  const searchInputRef = useRef(null);

  // Auto-focus search input when component mounts
  useEffect(() => {
    if (searchInputRef.current) {
      searchInputRef.current.focus();
    }
  }, []);

  const handleChange = (e) => {
    const q = e.target.value;
    setLocalQuery(q);
    setSearchQuery(q);
    performSearch(q);
  };

  const handleKeyPress = (e) => {
    if (e.key === 'Enter') {
      const q = e.target.value.trim();
      setLocalQuery(q);
      setSearchQuery(q);
      performSearch(q);
    }
  };

  const songs = useMemo(() => {
    if (searchQuery && searchQuery.trim()) {
      return searchResults.songs || [];
    }
    return [];
  }, [searchQuery, searchResults.songs]);

  const albums = useMemo(() => {
    if (searchQuery && searchQuery.trim()) {
      return searchResults.albums || [];
    }
    return [];
  }, [searchQuery, searchResults.albums]);

  const playlistResults = useMemo(() => {
    if (searchQuery && searchQuery.trim()) {
      return searchResults.playlists || [];
    }
    return [];
  }, [searchQuery, searchResults.playlists]);

  const totalResults = songs.length + albums.length + playlistResults.length;

  return (
    <div className="space-y-8 animate-fade-in">
      <div>
        <h1 className="text-4xl font-bold text-gray-900 dark:text-gray-100 mb-2">Search</h1>
        <p className="text-sm text-gray-500 dark:text-gray-400">Search for songs, artists, or albums</p>
      </div>

      <div className="max-w-3xl">
        <div className="relative bg-gray-100 dark:bg-gray-800 rounded-2xl px-4 py-3 flex items-center">
          <svg className="w-5 h-5 text-gray-400 mr-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
          </svg>
          <input 
            ref={searchInputRef}
            value={localQuery} 
            onChange={handleChange} 
            onKeyPress={handleKeyPress}
            placeholder="Search songs, artists, albums..." 
            className="w-full bg-transparent outline-none text-gray-900 dark:text-gray-100 placeholder-gray-500 dark:placeholder-gray-400" 
          />
          {localQuery && (
            <button
              onClick={() => {
                setLocalQuery("");
                setSearchQuery("");
                performSearch("");
              }}
              className="ml-3 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 transition-colors"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          )}
        </div>
        
      </div>

      {searchQuery && searchQuery.trim() ? (
        <div>
          <div className="flex items-center justify-between mb-6">
            <h3 className="text-lg font-semibold text-gray-700 dark:text-gray-300">
              Results for "{searchQuery}" ({totalResults} found)
            </h3>
            
            {/* Search Tabs */}
            <div className="flex space-x-1 bg-gray-100 dark:bg-gray-800 rounded-lg p-1">
              <button
                onClick={() => setActiveTab('all')}
                className={`px-4 py-2 rounded-md text-sm font-medium transition-colors ${
                  activeTab === 'all'
                    ? 'bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 shadow-sm'
                    : 'text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-100'
                }`}
              >
                All ({totalResults})
              </button>
              <button
                onClick={() => setActiveTab('songs')}
                className={`px-4 py-2 rounded-md text-sm font-medium transition-colors ${
                  activeTab === 'songs'
                    ? 'bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 shadow-sm'
                    : 'text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-100'
                }`}
              >
                Songs ({songs.length})
              </button>
              <button
                onClick={() => setActiveTab('albums')}
                className={`px-4 py-2 rounded-md text-sm font-medium transition-colors ${
                  activeTab === 'albums'
                    ? 'bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 shadow-sm'
                    : 'text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-100'
                }`}
              >
                Albums ({albums.length})
              </button>
              <button
                onClick={() => setActiveTab('playlists')}
                className={`px-4 py-2 rounded-md text-sm font-medium transition-colors ${
                  activeTab === 'playlists'
                    ? 'bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 shadow-sm'
                    : 'text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-100'
                }`}
              >
                Playlists ({playlistResults.length})
              </button>
            </div>
          </div>

          {/* Results Content */}
          {totalResults > 0 ? (
            <div className="space-y-8">
              {/* Songs Section */}
              {(activeTab === 'all' || activeTab === 'songs') && songs.length > 0 && (
                <div>
                  <h4 className="text-md font-semibold mb-4 text-gray-600 dark:text-gray-400">
                    Songs ({songs.length})
                  </h4>
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 2xl:grid-cols-5 gap-6">
                    {songs.map((s, idx) => (
                      <div key={s._id || idx}>
                        <SongItem
                          image={s.image}
                          name={s.name}
                          desc={s.desc}
                          id={s._id}
                          duration={s.duration}
                          album={s.album}
                        />
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Albums Section */}
              {(activeTab === 'all' || activeTab === 'albums') && albums.length > 0 && (
                <div>
                  <h4 className="text-md font-semibold mb-4 text-gray-600 dark:text-gray-400">
                    Albums ({albums.length})
                  </h4>
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 2xl:grid-cols-5 gap-6">
                    {albums.map((album, idx) => (
                      <div key={album._id || idx}>
                        <AlbumItem
                          image={album.image}
                          name={album.name}
                          desc={album.desc}
                          id={album._id}
                        />
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Playlists Section */}
              {(activeTab === 'all' || activeTab === 'playlists') && playlistResults.length > 0 && (
                <div>
                  <h4 className="text-md font-semibold mb-4 text-gray-600 dark:text-gray-400">
                    Playlists ({playlistResults.length})
                  </h4>
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 2xl:grid-cols-5 gap-6">
                    {playlistResults.map((playlist, idx) => (
                      <div key={playlist._id || idx}>
                        <PlaylistItem
                          id={playlist._id}
                          name={playlist.name}
                          songCount={playlist.songs?.length || 0}
                          image={playlist.image}
                        />
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          ) : (
            <div className="text-center py-12">
              <div className="w-16 h-16 bg-gray-100 dark:bg-gray-800 rounded-full flex items-center justify-center text-2xl mx-auto mb-4">
                🔍
              </div>
              <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-2">No results found</h3>
              <p className="text-gray-500 dark:text-gray-400">Try searching with different keywords</p>
            </div>
          )}
        </div>
      ) : (
        <div className="text-center py-12">
          <div className="w-16 h-16 bg-gray-100 dark:bg-gray-800 rounded-full flex items-center justify-center text-2xl mx-auto mb-4">
            🎵
          </div>
          <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-2">Start searching</h3>
          <p className="text-gray-500 dark:text-gray-400">Search for songs, artists, albums, or playlists</p>
        </div>
      )}
    </div>
  );
};

export default SearchPage;
