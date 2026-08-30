/**
 * Main Application - 건국대학교 산업디자인학과 졸업전시 STANDBY 웹 필터 앱
 */
document.addEventListener('DOMContentLoaded', async () => {
  const config = window.APP_CONFIG;
  
  // DOM 요소 참조
  const video = document.getElementById('camera-feed');
  const canvas = document.getElementById('render-canvas');
  const flashEl = document.querySelector('.flash-effect');
  const focusRing = document.querySelector('.focus-ring');
  const timerOverlay = document.querySelector('.timer-overlay');
  const timerNumber = document.querySelector('.timer-number');
  const frameSelectorWrapper = document.querySelector('.frame-selector-wrapper');
  const frameCarousel = document.getElementById('frame-carousel');
  const shutterBtn = document.getElementById('shutter-btn');
  const flipBtn = document.getElementById('flip-camera-btn');
  const timerBtn = document.getElementById('timer-btn');
  const timerStatus = document.getElementById('timer-status');
  const galleryInput = document.getElementById('gallery-input');
  const galleryBtn = document.getElementById('gallery-btn');
  const eventInfoBtn = document.getElementById('event-info-btn');
  const brandBadge = document.getElementById('brand-badge');

  // 모달 요소들
  const resultModal = document.getElementById('result-modal');
  const previewImg = document.getElementById('preview-img');
  const btnShareStory = document.getElementById('btn-share-story');
  const btnDownload = document.getElementById('btn-download');
  const btnRetake = document.getElementById('btn-retake');
  const btnCopyHashtags = document.getElementById('btn-copy-hashtags');
  const hashtagText = document.getElementById('hashtag-display');
  const eventModal = document.getElementById('event-modal');
  const closeEventModalBtn = document.getElementById('close-event-modal');
  const btnGoInstagram = document.getElementById('btn-go-instagram');
  const toastEl = document.getElementById('toast');

  // 컨트롤러 인스턴스
  const camera = new CameraController(video);
  const renderer = new FilterRenderer(canvas, video, config);
  const share = new ShareManager(config);

  // 상태 변수
  let currentTimerSeconds = 0; // 0, 3, 5
  let isCapturing = false;
  let lastCapturedBlob = null;
  let lastCapturedDataUrl = null;

  // 1. 오디오 신시사이저 (찰칵 셔터 효과음)
  const playShutterSound = () => {
    try {
      const AudioContext = window.AudioContext || window.webkitAudioContext;
      if (!AudioContext) return;
      const ctx = new AudioContext();

      const bufferSize = ctx.sampleRate * 0.08;
      const buffer = ctx.createBuffer(1, bufferSize, ctx.sampleRate);
      const output = buffer.getChannelData(0);
      for (let i = 0; i < bufferSize; i++) {
        output[i] = Math.random() * 2 - 1;
      }

      const whiteNoise = ctx.createBufferSource();
      whiteNoise.buffer = buffer;

      const filter = ctx.createBiquadFilter();
      filter.type = 'bandpass';
      filter.frequency.setValueAtTime(1400, ctx.currentTime);
      filter.Q.setValueAtTime(3, ctx.currentTime);

      const gain = ctx.createGain();
      gain.gain.setValueAtTime(0.8, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.08);

      whiteNoise.connect(filter);
      filter.connect(gain);
      gain.connect(ctx.destination);

      whiteNoise.start();
    } catch (e) {
      console.warn('사운드 재생 에러:', e);
    }
  };

  // 2. 햅틱 진동
  const triggerHaptic = () => {
    if (navigator.vibrate) {
      navigator.vibrate([30, 40, 50]);
    }
  };

  // 3. 토스트 알림 표시
  const showToast = (message) => {
    toastEl.textContent = message;
    toastEl.classList.add('show');
    setTimeout(() => {
      toastEl.classList.remove('show');
    }, 2400);
  };

  // 4. 프레임 설정 및 초기화 (단일 프레임일 경우 캐러셀 영역 숨김)
  const initFrames = () => {
    if (!config.frames || config.frames.length <= 1) {
      if (frameSelectorWrapper) {
        frameSelectorWrapper.style.display = 'none';
      }
      return;
    }

    frameCarousel.innerHTML = '';
    config.frames.forEach((frame, index) => {
      const card = document.createElement('div');
      card.className = `frame-card ${index === 0 ? 'active' : ''}`;
      card.dataset.frameId = frame.id;
      
      card.innerHTML = `
        <div class="frame-thumb">
          <span class="frame-code">${frame.code || '0' + (index + 1)}</span>
        </div>
        <span class="frame-title">${frame.name}</span>
      `;

      card.addEventListener('click', () => {
        document.querySelectorAll('.frame-card').forEach(c => c.classList.remove('active'));
        card.classList.add('active');
        renderer.setFrame(frame.id);
        card.scrollIntoView({ behavior: 'smooth', inline: 'center', block: 'nearest' });
      });

      frameCarousel.appendChild(card);
    });
  };

  // 5. 카메라 초기화 및 시작
  try {
    await camera.startCamera('user');
    renderer.start(camera.isFrontCamera());
  } catch (err) {
    console.error('카메라 시작 실패:', err);
    showToast('CAMERA PERMISSION REQUIRED OR USE UPLOAD');
    renderer.start(false);
  }

  initFrames();
  hashtagText.textContent = config.exhibition.hashtags.join(' ');

  // 6. 카메라 전/후면 전환 버튼
  flipBtn.addEventListener('click', async () => {
    try {
      flipBtn.style.opacity = '0.5';
      await camera.toggleFacingMode();
      renderer.isFrontCamera = camera.isFrontCamera();
      renderer.clearCustomImage();
      setTimeout(() => { flipBtn.style.opacity = '1'; }, 200);
    } catch (err) {
      showToast('CAMERA FLIP NOT SUPPORTED');
    }
  });

  // 7. 타이머 버튼 토글 (OFF -> 3S -> 5S -> OFF)
  timerBtn.addEventListener('click', () => {
    if (currentTimerSeconds === 0) {
      currentTimerSeconds = 3;
      timerStatus.textContent = '3S';
      timerBtn.classList.add('active');
    } else if (currentTimerSeconds === 3) {
      currentTimerSeconds = 5;
      timerStatus.textContent = '5S';
      timerBtn.classList.add('active');
    } else {
      currentTimerSeconds = 0;
      timerStatus.textContent = 'OFF';
      timerBtn.classList.remove('active');
    }
  });

  // 8. 갤러리 사진 선택 (앨범에서 사진 불러오기)
  galleryBtn.addEventListener('click', () => {
    galleryInput.click();
  });

  galleryInput.addEventListener('change', (e) => {
    const file = e.target.files[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      const img = new Image();
      img.onload = () => {
        renderer.setCustomImage(img);
        showToast('IMAGE LOADED // READY');
      };
      img.src = event.target.result;
    };
    reader.readAsDataURL(file);
  });

  // 9. 화면 터치 초점 링 애니메이션
  canvas.addEventListener('pointerdown', (e) => {
    const rect = canvas.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;

    focusRing.style.left = `${x}px`;
    focusRing.style.top = `${y}px`;
    focusRing.classList.add('active');

    setTimeout(() => {
      focusRing.classList.remove('active');
    }, 800);
  });

  // 10. 촬영 실행 로직
  const executeCapture = async () => {
    flashEl.classList.add('active');
    playShutterSound();
    triggerHaptic();

    setTimeout(() => {
      flashEl.classList.remove('active');
    }, 120);

    const { blob, dataUrl } = await renderer.captureSnapshot();
    lastCapturedBlob = blob;
    lastCapturedDataUrl = dataUrl;

    previewImg.src = dataUrl;
    resultModal.classList.add('active');
    isCapturing = false;
  };

  // 셔터 버튼 클릭
  shutterBtn.addEventListener('click', async () => {
    if (isCapturing) return;
    isCapturing = true;

    if (currentTimerSeconds > 0) {
      let count = currentTimerSeconds;
      timerNumber.textContent = count;
      timerOverlay.classList.add('active');

      const timerInterval = setInterval(() => {
        count--;
        if (count > 0) {
          timerNumber.textContent = count;
        } else {
          clearInterval(timerInterval);
          timerOverlay.classList.remove('active');
          executeCapture();
        }
      }, 1000);
    } else {
      executeCapture();
    }
  });

  // 11. 결과 모달 액션들
  btnShareStory.addEventListener('click', async () => {
    if (!lastCapturedBlob) return;
    const res = await share.shareImage(lastCapturedBlob, `kuid_standby_${Date.now()}.jpg`);
    if (res.method === 'web-share') {
      showToast('STORY SHARE SHEET OPENED');
    } else if (res.method === 'download') {
      showToast('IMAGE SAVED TO DEVICE');
    }
  });

  btnDownload.addEventListener('click', () => {
    if (!lastCapturedDataUrl) return;
    share.downloadImage(lastCapturedDataUrl, `kuid_standby_${Date.now()}.jpg`);
    showToast('IMAGE SAVED TO DEVICE');
  });

  btnRetake.addEventListener('click', () => {
    resultModal.classList.remove('active');
  });

  btnCopyHashtags.addEventListener('click', async () => {
    const ok = await share.copyHashtags();
    if (ok) {
      showToast('HASHTAGS COPIED TO CLIPBOARD');
    }
  });

  // 12. 이벤트 안내 모달
  const openEventModal = () => {
    eventModal.classList.add('active');
  };
  eventInfoBtn.addEventListener('click', openEventModal);
  brandBadge.addEventListener('click', openEventModal);

  closeEventModalBtn.addEventListener('click', () => {
    eventModal.classList.remove('active');
  });

  btnGoInstagram.addEventListener('click', () => {
    share.openInstagramAccount();
  });

  [resultModal, eventModal].forEach(modal => {
    modal.addEventListener('click', (e) => {
      if (e.target === modal) {
        modal.classList.remove('active');
      }
    });
  });
});
