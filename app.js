const ALBUM_COVER = 'assets/images/Black and Red Retro Simple Nostalgic Album Cover.png';
const LABEL = 'ILAAMA';

const tracks = [
  {
    title: 'I mean Hello',
    artist: 'ILAAMA x GOODNIXX',
    src: 'assets/audio/I mean hello.wav',
    cover: ALBUM_COVER,
    duration: '—',
  },
];

const audio = document.getElementById('audio');
const playlistEl = document.getElementById('playlist');
const playBtn = document.getElementById('playBtn');
const trackTitle = document.getElementById('trackTitle');
const trackArtist = document.getElementById('trackArtist');
const albumArt = document.getElementById('albumArt');
const miniTitle = document.getElementById('miniTitle');
const miniArtist = document.getElementById('miniArtist');
const miniArt = document.getElementById('miniArt');

const iconPlay = playBtn.querySelector('.icon-play');
const iconPause = playBtn.querySelector('.icon-pause');

let currentIndex = -1;
let isPlaying = false;

function formatArtists(track) {
  if (track.artist && track.artist !== LABEL) {
    if (track.artist.includes(LABEL)) {
      return track.artist;
    }
    return `${track.artist} · ${LABEL}`;
  }
  return LABEL;
}

function formatDuration(seconds) {
  if (!seconds || isNaN(seconds)) return '—';
  const mins = Math.floor(seconds / 60);
  const secs = Math.floor(seconds % 60);
  return `${mins}:${secs.toString().padStart(2, '0')}`;
}

function assetUrl(path) {
  return new URL(path, window.location.href).href;
}

function setAlbumArt(container, coverPath, alt) {
  container.innerHTML = '';
  const img = document.createElement('img');
  img.src = assetUrl(coverPath);
  img.alt = alt;
  container.appendChild(img);
}

function updateUI() {
  const track = currentIndex >= 0 ? tracks[currentIndex] : null;

  if (track) {
    trackTitle.textContent = track.title;
    trackArtist.textContent = formatArtists(track);
    miniTitle.textContent = track.title;
    miniArtist.textContent = formatArtists(track);
    setAlbumArt(albumArt, track.cover, `${track.title} cover`);
    setAlbumArt(miniArt, track.cover, `${track.title} cover`);
    playBtn.disabled = false;
  } else {
    trackTitle.textContent = 'Select a track';
    trackArtist.textContent = '—';
    miniTitle.textContent = 'No track selected';
    miniArtist.textContent = '—';
    albumArt.innerHTML = `
      <div class="album-art-placeholder">
        <svg viewBox="0 0 24 24" width="64" height="64" fill="currentColor" opacity="0.4">
          <path d="M12 3v10.55c-.59-.34-1.27-.55-2-.55-2.21 0-4 1.79-4 4s1.79 4 4 4 4-1.79 4-4V7h4V3h-6z"/>
        </svg>
      </div>`;
    miniArt.innerHTML = `
      <svg viewBox="0 0 24 24" width="20" height="20" fill="currentColor" opacity="0.5">
        <path d="M12 3v10.55c-.59-.34-1.27-.55-2-.55-2.21 0-4 1.79-4 4s1.79 4 4 4 4-1.79 4-4V7h4V3h-6z"/>
      </svg>`;
    playBtn.disabled = true;
  }

  document.querySelectorAll('.playlist-item').forEach((item, i) => {
    item.classList.toggle('active', i === currentIndex);
  });

  updatePlayButton();
}

function updatePlayButton() {
  iconPlay.hidden = isPlaying;
  iconPause.hidden = !isPlaying;
  playBtn.classList.toggle('playing', isPlaying);
  playBtn.setAttribute('aria-label', isPlaying ? 'Pause' : 'Play');
}

function playAudio() {
  const playPromise = audio.play();
  if (playPromise) {
    playPromise.catch(() => {
      isPlaying = false;
      updatePlayButton();
    });
  }
}

function loadTrack(index) {
  currentIndex = index;
  const track = tracks[index];
  audio.pause();
  audio.src = assetUrl(track.src);
  audio.load();
  updateUI();
}

function playTrack(index) {
  if (index === currentIndex && audio.src) {
    if (isPlaying) {
      audio.pause();
    } else {
      playAudio();
    }
    return;
  }

  loadTrack(index);

  const onReady = () => {
    audio.removeEventListener('canplay', onReady);
    audio.removeEventListener('error', onError);
    playAudio();
  };

  const onError = () => {
    audio.removeEventListener('canplay', onReady);
    audio.removeEventListener('error', onError);
    isPlaying = false;
    updatePlayButton();
  };

  if (audio.readyState >= HTMLMediaElement.HAVE_FUTURE_DATA) {
    playAudio();
  } else {
    audio.addEventListener('canplay', onReady);
    audio.addEventListener('error', onError);
  }
}

function togglePlayPause() {
  if (currentIndex < 0) return;

  if (isPlaying) {
    audio.pause();
  } else {
    playAudio();
  }
}

function buildPlaylist() {
  const header = document.createElement('div');
  header.className = 'playlist-header';
  header.innerHTML = `
    <span>#</span>
    <span>Title</span>
    <span>Artist</span>
    <span style="text-align:right">Time</span>
  `;
  playlistEl.appendChild(header);

  tracks.forEach((track, index) => {
    const li = document.createElement('li');
    li.className = 'playlist-item';
    li.innerHTML = `
      <div class="item-index">
        <span class="item-index-number">${index + 1}</span>
        <svg class="item-playing-icon" viewBox="0 0 24 24" width="16" height="16" fill="currentColor">
          <path d="M8 5v14l11-7z"/>
        </svg>
      </div>
      <span class="item-title">${track.title}</span>
      <span class="item-artist">${formatArtists(track)}</span>
      <span class="item-duration" data-index="${index}">${track.duration}</span>
    `;

    li.addEventListener('click', () => playTrack(index));
    playlistEl.appendChild(li);
  });
}

function updateDurationsFromMetadata() {
  audio.addEventListener('loadedmetadata', () => {
    if (currentIndex >= 0) {
      const durationEl = document.querySelector(
        `.item-duration[data-index="${currentIndex}"]`
      );
      if (durationEl) {
        durationEl.textContent = formatDuration(audio.duration);
      }
    }
  });
}

audio.addEventListener('ended', () => {
  isPlaying = false;
  updatePlayButton();
});

audio.addEventListener('play', () => {
  isPlaying = true;
  updatePlayButton();
});

audio.addEventListener('pause', () => {
  isPlaying = false;
  updatePlayButton();
});

playBtn.addEventListener('click', togglePlayPause);

buildPlaylist();
updateDurationsFromMetadata();
updateUI();
