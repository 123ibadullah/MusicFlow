// components/Display.jsx
import React, { useEffect, useRef } from "react";
import { Route, Routes, useLocation } from "react-router-dom";
import DisplayHome from "./DisplayHome";
import DisplayAlbum from "./DisplayAlbum";
import DisplayPlaylist from "./DisplayPlaylist";
import DisplayPlaylists from "./DisplayPlaylists";
import LikedSongs from "./LikedSongs";
import RecentlyPlayed from "./RecentlyPlayed";
import AllSongs from "./AllSongs";
import AllAlbums from "./AllAlbums";
import Library from "./Library";
import SearchPage from "./SearchPage";
import Navbar from "./Navbar";
import { usePlayer } from "../context/PlayerContext";

const Display = ({ onOpenMobileSidebar }) => {
  const { albumsData } = usePlayer();
  const displayRef = useRef();
  const location = useLocation();
  
  const isAlbum = location.pathname.includes("/album/");
  const albumId = isAlbum ? location.pathname.split("/").pop() : "";
  const album = isAlbum ? albumsData.find((x) => x && x._id === albumId) : null;

  useEffect(() => {
    if (displayRef.current) {
      if (isAlbum && album) {
        displayRef.current.style.background = `linear-gradient(135deg, ${album.bgColor}20, transparent)`;
      } else {
        displayRef.current.style.background = `transparent`;
      }
    }
  }, [isAlbum, album]);

  return (
    <div
      ref={displayRef}
      className="flex-1 flex flex-col overflow-hidden bg-gray-50 dark:bg-gray-900 transition-all duration-500"
    >
      <Navbar onOpenMobileSidebar={onOpenMobileSidebar} />
      <div className="flex-1 overflow-auto">
        <div className="max-w-7xl mx-auto px-6 py-8">
          <Routes>
            <Route path="/" element={<DisplayHome />} />
            <Route path="/library" element={<Library />} />
            <Route path="/liked" element={<LikedSongs />} />
            <Route path="/recent" element={<RecentlyPlayed />} />
            <Route path="/search" element={<SearchPage />} />
            <Route path="/songs" element={<AllSongs />} />
            <Route path="/albums" element={<AllAlbums />} />
            <Route path="/playlists" element={<DisplayPlaylists />} />
            <Route 
              path="/album/:id" 
              element={<DisplayAlbum album={album} />} 
            />
            <Route path="/playlist/:id" element={<DisplayPlaylist />} />
          </Routes>
        </div>
      </div>
    </div>
  );
};

export default Display;