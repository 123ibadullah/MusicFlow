// components/RecentlyPlayed.jsx
import React, { useState, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import SongItem from "./SongItem";
import SkeletonLoader from "./SkeletonLoader";
import { usePlayer } from "../context/PlayerContext";
import { useToast } from "../context/ThemeContext";

const RecentlyPlayed = () => {
  const navigate = useNavigate();
  const { showToast } = useToast();
  const { songsData, recentlyPlayed, playWithId } = usePlayer();
  const [searchQuery, setSearchQuery] = useState("");
  const [sortBy, setSortBy] = useState("recent");
  const [isLoading, setIsLoading] = useState(false);

  // Filter and sort recently played songs
  const filteredRecentlyPlayed = useMemo(() => {
    let filtered = recentlyPlayed.filter(song => {
      if (!searchQuery) return true;
      const query = searchQuery.toLowerCase();
      return song.name?.toLowerCase().includes(query) || 
             song.desc?.toLowerCase().includes(query) ||
             song.album?.toLowerCase().includes(query);
    });

    // Sort songs
    switch (sortBy) {
      case "recent":
        return filtered.sort((a, b) => {
          const dateA = a.playedAt || 0;
          const dateB = b.playedAt || 0;
          return new Date(dateB) - new Date(dateA);
        });
      case "name":
        return filtered.sort((a, b) => (a.name || "").localeCompare(b.name || ""));
      case "album":
        return filtered.sort((a, b) => (a.album || "").localeCompare(b.album || ""));
      default:
        return filtered;
    }
  }, [recentlyPlayed, searchQuery, sortBy]);

  const handleBack = () => {
    navigate(-1);
  };

  const handlePlayAll = () => {
    if (filteredRecentlyPlayed.length > 0) {
      playWithId(filteredRecentlyPlayed[0]._id, filteredRecentlyPlayed);
      showToast(`Playing all ${filteredRecentlyPlayed.length} recently played songs`, "success");
    } else {
      showToast("No recently played songs to play", "info");
    }
  };

  const formatLastPlayed = (dateString) => {
    if (!dateString) return "Unknown";
    
    const date = new Date(dateString);
    if (isNaN(date.getTime())) return "Unknown";
    
    const now = new Date();
    const diffInMs = now - date;
    const diffInMinutes = Math.floor(diffInMs / (1000 * 60));
    const diffInHours = Math.floor(diffInMs / (1000 * 60 * 60));
    const diffInDays = Math.floor(diffInMs / (1000 * 60 * 60 * 24));
    
    if (diffInMinutes < 1) return "Just now";
    if (diffInMinutes < 60) return `${diffInMinutes}m ago`;
    if (diffInHours < 24) return `${diffInHours}h ago`;
    if (diffInDays < 7) return `${diffInDays}d ago`;
    return date.toLocaleDateString();
  };

  return (
    <div className="space-y-8 animate-fade-in">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-4">
          <button
            onClick={handleBack}
            className="p-2 rounded-full bg-white dark:bg-gray-800 shadow-lg hover:shadow-xl transition-all duration-300 hover:scale-105 border border-gray-200 dark:border-gray-700"
            title="Go back"
          >
            <svg className="w-5 h-5 text-gray-600 dark:text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
            </svg>
          </button>
          <div>
            <h1 className="text-4xl font-bold text-gray-900 dark:text-gray-100">Recently Played</h1>
            <p className="text-gray-500 dark:text-gray-400 mt-1">
              {filteredRecentlyPlayed.length} {filteredRecentlyPlayed.length === 1 ? 'song' : 'songs'} you've played recently
            </p>
          </div>
        </div>

        <button
          onClick={handlePlayAll}
          disabled={filteredRecentlyPlayed.length === 0}
          className="px-6 py-3 bg-blue-500 hover:bg-blue-600 disabled:bg-gray-400 disabled:cursor-not-allowed text-white rounded-full font-semibold transition-all duration-300 hover:scale-105 shadow-lg hover:shadow-xl"
        >
          Play All
        </button>
      </div>

      {/* Search and Filter */}
      <div className="flex flex-col sm:flex-row gap-4 items-center justify-between">
        <div className="relative flex-1 max-w-md">
          <svg className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
          </svg>
          <input
            type="text"
            placeholder="Search your recently played songs..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-10 pr-4 py-3 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all duration-300"
          />
        </div>

        <div className="relative">
          <select
            value={sortBy}
            onChange={(e) => setSortBy(e.target.value)}
            className="appearance-none px-6 py-3 pr-10 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all duration-300 cursor-pointer hover:shadow-lg font-semibold text-gray-700 dark:text-gray-300 min-w-[180px]"
          >
            <option value="recent">Most Recent</option>
            <option value="name">Name A-Z</option>
            <option value="album">Album A-Z</option>
          </select>
          <div className="absolute inset-y-0 right-0 flex items-center pr-3 pointer-events-none">
            <svg className="w-5 h-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
            </svg>
          </div>
        </div>
      </div>

      {/* Songs Grid */}
      {isLoading ? (
        <SkeletonLoader type="card" count={12} className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 2xl:grid-cols-5 gap-6" />
      ) : filteredRecentlyPlayed.length > 0 ? (
        <div className="space-y-6">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 2xl:grid-cols-5 gap-6">
            {filteredRecentlyPlayed.map((song, index) => (
              <div key={song._id || index} className="animate-slide-up" style={{ animationDelay: `${index * 0.1}s` }}>
                <div className="relative">
                  <SongItem
                    image={song.image}
                    name={song.name}
                    desc={song.desc}
                    id={song._id}
                    duration={song.duration}
                    album={song.album}
                  />
                  {/* Last Played Badge */}
                  <div className="absolute top-2 left-2 bg-blue-500/90 text-white text-xs px-2 py-1 rounded-full backdrop-blur-sm">
                    {formatLastPlayed(song.playedAt)}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      ) : (
        <div className="text-center py-16">
          <div className="w-24 h-24 bg-gray-100 dark:bg-gray-800 rounded-full flex items-center justify-center text-4xl mx-auto mb-6">
            🎵
          </div>
          <h3 className="text-2xl font-bold text-gray-900 dark:text-gray-100 mb-4">
            {searchQuery ? 'No recently played songs found' : 'No recently played songs yet'}
          </h3>
          <p className="text-gray-500 dark:text-gray-400 mb-8 max-w-md mx-auto">
            {searchQuery 
              ? `No recently played songs match your search "${searchQuery}"`
              : 'Start playing songs to see them here. Your recently played songs will appear automatically.'
            }
          </p>
          {!searchQuery && (
            <button
              onClick={() => navigate('/songs')}
              className="px-8 py-3 bg-blue-500 hover:bg-blue-600 text-white rounded-full font-semibold transition-all duration-300 hover:scale-105 shadow-lg hover:shadow-xl"
            >
              Explore Songs
            </button>
          )}
        </div>
      )}
    </div>
  );
};

export default RecentlyPlayed;
