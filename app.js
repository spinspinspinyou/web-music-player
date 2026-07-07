const ALBUM_COVER = 'assets/images/Black and Red Retro Simple Nostalgic Album Cover.png';
const LABEL = 'ILAAMA';

const tracks = [
  {
    id: 'i-mean-hello',
    title: 'I mean Hello',
    artist: 'ILAAMA x GOODNIXX',
    fallbackSrc: 'assets/audio/I mean hello.wav',
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
let isLoadingTrack = false;
const signedUrlCache = new Map();

function isSupabaseConfigured() {
  return (
    window.SUPABASE_URL &&
    window.SUPABASE_ANON_KEY &&
    !window.SUPABASE_URL.includes('YOUR_PROJECT_REF') &&
    !window.SUPABASE_ANON_KEY.includes('YOUR_ANON_KEY')
  );
}

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

function showStreamError(message) {
  trackArtist.textContent = message;
  miniArtist.textContent = message;
}

async function fetchSignedUrl(trackId) {
  const cached = signedUrlCache.get(trackId);
  if (cached && cached.expiresAt > Date.now() + 60_000) {
    return cached.url;
  }

  if (!isSupabaseConfigured()) {
    throw new Error('Streaming not configured — add supabase-config.js');
  }

  const response = await fetch(`${window.SUPABASE_URL}/functions/v1/get-track-url`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      apikey: window.SUPABASE_ANON_KEY,
      Authorization: `Bearer ${window.SUPABASE_ANON_KEY}`,
    },
    body: JSON.stringify({ trackId }),
  });

  if (!response.ok) {
    throw new Error('Unable to load track');
  }

  const data = await response.json();
  if (!data.url) {
    throw new Error('Invalid stream response');
  }

  signedUrlCache.set(trackId, {
    url: data.url,
    expiresAt: Date.now() + (data.expiresIn ?? 3600) * 1000,
  });

  return data.url;
}

function updateUI() {
  const track = currentIndex >= 0 ? tracks[currentIndex] : null;

  if (track) {
    trackTitle.textContent = track.title;
    if (!isLoadingTrack) {
      trackArtist.textContent = formatArtists(track);
      miniArtist.textContent = formatArtists(track);
    }
    miniTitle.textContent = track.title;
    setAlbumArt(albumArt, track.cover, `${track.title} cover`);
    setAlbumArt(miniArt, track.cover, `${track.title} cover`);
    playBtn.disabled = isLoadingTrack;
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
    item.classList.toggle('loading', i === currentIndex && isLoadingTrack);
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

function waitForAudioReady() {
  return new Promise((resolve, reject) => {
    const onReady = () => {
      cleanup();
      resolve();
    };
    const onError = () => {
      cleanup();
      reject(new Error('Playback failed'));
    };
    const cleanup = () => {
      audio.removeEventListener('canplay', onReady);
      audio.removeEventListener('error', onError);
    };

    if (audio.readyState >= HTMLMediaElement.HAVE_FUTURE_DATA) {
      resolve();
      return;
    }

    audio.addEventListener('canplay', onReady);
    audio.addEventListener('error', onError);
  });
}

async function resolveTrackUrl(track) {
  if (isSupabaseConfigured()) {
    try {
      return await fetchSignedUrl(track.id);
    } catch {
      // Supabase not ready yet — use local fallback
    }
  }

  if (track.fallbackSrc) {
    return assetUrl(track.fallbackSrc);
  }

  throw new Error('Stream unavailable');
}

async function loadTrack(index) {
  currentIndex = index;
  const track = tracks[index];
  audio.pause();
  isLoadingTrack = true;
  updateUI();

  try {
    audio.src = await resolveTrackUrl(track);
    audio.load();
    isLoadingTrack = false;
    updateUI();
  } catch {
    isLoadingTrack = false;
    showStreamError('Stream unavailable');
    updateUI();
    throw new Error('Stream unavailable');
  }
}

async function playTrack(index) {
  if (index === currentIndex && audio.src && !isLoadingTrack) {
    if (isPlaying) {
      audio.pause();
    } else {
      playAudio();
    }
    return;
  }

  try {
    await loadTrack(index);
    await waitForAudioReady();
    playAudio();
  } catch {
    isPlaying = false;
    updatePlayButton();
  }
}

function togglePlayPause() {
  if (currentIndex < 0 || isLoadingTrack) return;

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
