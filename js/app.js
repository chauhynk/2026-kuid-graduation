/**
 * Main Application - 건국대학교 산업디자인학과 졸업전시 STANDBY 웹 필터 앱
 * - 사진(PHOTO) 및 영상(VIDEO) 녹화 지원
 * - 비네팅 제거 & 클린 모바일 뷰
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

  // 모드 전환 및 녹화 인디케이터
  const modePhotoBtn = document.getElementById('mode-photo-btn');
  const modeVideoBtn = document.getElementById('mode-video-btn');
  const recordIndicator = document.getElementById('record-indicator');
  const recordTimer = document.getElementById('record-timer');

  // 모달 요소들
  const resultModal = document.getElementById('result-modal');
  const resultTitle = document.getElementById('result-title');
  const previewImg = document.getElementById('preview-img');
  const previewVideo = document.getElementById('preview-video');
  const btnShareStory = document.getElementById('btn-share-story');
  const btnShareText = document.getElementById('btn-share-text');
  const btnDownload = document.getElementById('btn-download');
  const btnDownloadText = document.getElementById('btn-download-text');
  const btnRetake = document.getElementById('btn-retake');
  const btnCopyHashtags = document.getElementById('btn-copy-hashtags');
  const hashtagText = document.getElementById('hashtag-display');
  const eventModal = document.getElementById('event-modal');
  const closeEventModalBtn = document.getElementById('close-event-modal');
  const closeEventModalTopBtn = document.getElementById('close-event-modal-top');
  const btnGoInstagram = document.getElementById('btn-go-instagram');
  const aboutModal = document.getElementById('about-modal');
  const closeAboutModalBtn = document.getElementById('close-about-modal');
  const btnAboutInstagram = document.getElementById('btn-about-instagram');
  const toastEl = document.getElementById('toast');

  // 컨트롤러 인스턴스
  const camera = new CameraController(video);
  const renderer = new FilterRenderer(canvas, video, config);
  const share = new ShareManager(config);

  // 상태 변수
  let currentMode = 'photo'; // 'photo' or 'video'
  let currentTimerSeconds = 0; // 0, 3, 5
  let isCapturing = false;
  let isRecording = false;
  let recordingSeconds = 0;
  let recordingInterval = null;
  const MAX_RECORD_SECONDS = 15; // 최대 15초 녹화

  let lastResultType = 'photo'; // 'photo' or 'video'
  let lastCapturedBlob = null;
  let lastCapturedDataUrl = null;
  let lastRecordedBlob = null;
  let lastRecordedUrl = null;
  let lastRecordedExt = 'mp4';
  let lastRecordedMime = 'video/mp4';

  // 1. 오디오 신시사이저 (찰칵 셔터 효과음 & 녹화 비프음)
  const playSound = (type = 'shutter') => {
    try {
      const AudioContext = window.AudioContext || window.webkitAudioContext;
      if (!AudioContext) return;
      const ctx = new AudioContext();

      if (type === 'shutter') {
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
      } else if (type === 'beep') {
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.frequency.setValueAtTime(880, ctx.currentTime);
        gain.gain.setValueAtTime(0.3, ctx.currentTime);
        gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.1);
        osc.connect(gain);
        gain.connect(ctx.destination);
        osc.start();
        osc.stop(ctx.currentTime + 0.1);
      }
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

  // 3. 토스트 알림
  const showToast = (message) => {
    toastEl.textContent = message;
    toastEl.classList.add('show');
    setTimeout(() => {
      toastEl.classList.remove('show');
    }, 2400);
  };

  // 4. 모드 전환 (PHOTO / VIDEO)
  const setMode = (mode) => {
    if (isRecording) {
      stopVideoRecord();
    }

    currentMode = mode;
    if (mode === 'photo') {
      modePhotoBtn.classList.add('active');
      modeVideoBtn.classList.remove('active');
      showToast('PHOTO MODE // READY');
    } else {
      modeVideoBtn.classList.add('active');
      modePhotoBtn.classList.remove('active');
      showToast('VIDEO MODE // TAP TO RECORD');
    }
  };

  modePhotoBtn.addEventListener('click', () => setMode('photo'));
  modeVideoBtn.addEventListener('click', () => setMode('video'));

  // 5. 프레임 설정 및 초기화
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

  // 6. 카메라 초기화 및 시작
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

  // 7. 카메라 전/후면 전환 버튼
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

  // 8. 타이머 버튼 토글 (OFF -> 3S -> 5S -> OFF)
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

  // 9. 갤러리 파일 선택 (사진 또는 영상)
  galleryBtn.addEventListener('click', () => {
    galleryInput.click();
  });

  galleryInput.addEventListener('change', (e) => {
    const file = e.target.files[0];
    if (!file) return;

    if (file.type.startsWith('image/')) {
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
    } else if (file.type.startsWith('video/')) {
      const vid = document.createElement('video');
      vid.src = URL.createObjectURL(file);
      vid.autoplay = true;
      vid.loop = true;
      vid.muted = true;
      vid.playsInline = true;
      vid.onloadeddata = () => {
        renderer.setCustomImage(vid);
        vid.play();
        showToast('VIDEO LOADED // READY');
      };
    }
  });

  // 10. 화면 터치 초점 링 애니메이션
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

  // 11. 사진 촬영 로직
  const executePhotoCapture = async () => {
    flashEl.classList.add('active');
    playSound('shutter');
    triggerHaptic();

    setTimeout(() => {
      flashEl.classList.remove('active');
    }, 120);

    const { blob, dataUrl } = await renderer.captureSnapshot();
    lastResultType = 'photo';
    lastCapturedBlob = blob;
    lastCapturedDataUrl = dataUrl;

    // 모달 표시
    previewImg.src = dataUrl;
    previewImg.style.display = 'block';
    previewVideo.style.display = 'none';
    if (previewVideo.src) {
      previewVideo.pause();
    }

    resultTitle.textContent = 'CAPTURED // RESULT';
    btnShareText.textContent = 'SHARE TO INSTAGRAM STORY';
    btnDownloadText.textContent = 'SAVE IMAGE';

    resultModal.classList.add('active');
    isCapturing = false;
  };

  // 12. 영상 녹화 시작 로직
  const startVideoRecord = () => {
    if (isRecording) return;
    isRecording = true;
    recordingSeconds = 0;

    playSound('beep');
    triggerHaptic();

    renderer.startVideoRecording();

    // UI 상태 갱신
    shutterBtn.classList.add('recording');
    recordIndicator.classList.add('active');
    recordTimer.textContent = '00:00';

    recordingInterval = setInterval(() => {
      recordingSeconds++;
      const s = recordingSeconds < 10 ? `0${recordingSeconds}` : `${recordingSeconds}`;
      recordTimer.textContent = `00:${s}`;

      if (recordingSeconds >= MAX_RECORD_SECONDS) {
        stopVideoRecord();
      }
    }, 1000);
  };

  // 13. 영상 녹화 종료 로직
  const stopVideoRecord = async () => {
    if (!isRecording) return;
    isRecording = false;

    if (recordingInterval) {
      clearInterval(recordingInterval);
      recordingInterval = null;
    }

    shutterBtn.classList.remove('recording');
    recordIndicator.classList.remove('active');

    playSound('beep');
    triggerHaptic();

    const res = await renderer.stopVideoRecording();
    if (!res || !res.blob) return;

    lastResultType = 'video';
    lastRecordedBlob = res.blob;
    lastRecordedUrl = res.videoUrl;
    lastRecordedExt = res.ext;
    lastRecordedMime = res.mimeType;

    // 모달에 비디오 로드
    previewImg.style.display = 'none';
    previewVideo.style.display = 'block';
    previewVideo.src = res.videoUrl;
    previewVideo.play();

    resultTitle.textContent = 'RECORDED // VIDEO';
    btnShareText.textContent = 'SHARE TO INSTAGRAM STORY';
    btnDownloadText.textContent = 'SAVE VIDEO';

    resultModal.classList.add('active');
  };

  // 14. 셔터 버튼 클릭 이벤트
  shutterBtn.addEventListener('click', async () => {
    if (currentMode === 'video') {
      if (!isRecording) {
        startVideoRecord();
      } else {
        stopVideoRecord();
      }
      return;
    }

    // PHOTO 모드
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
          executePhotoCapture();
        }
      }, 1000);
    } else {
      executePhotoCapture();
    }
  });

  // 15. 인스타그램 스타일 길게 누르면 영상 녹화 (Hold to Record)
  let holdTimer = null;
  let isHoldRecording = false;

  shutterBtn.addEventListener('pointerdown', () => {
    if (currentMode === 'photo' && !isCapturing && currentTimerSeconds === 0) {
      holdTimer = setTimeout(() => {
        isHoldRecording = true;
        startVideoRecord();
      }, 450);
    }
  });

  const handlePointerUp = () => {
    if (holdTimer) {
      clearTimeout(holdTimer);
      holdTimer = null;
    }
    if (isHoldRecording) {
      isHoldRecording = false;
      stopVideoRecord();
    }
  };

  shutterBtn.addEventListener('pointerup', handlePointerUp);
  shutterBtn.addEventListener('pointercancel', handlePointerUp);

  // 16. 결과 모달 공유 & 다운로드 버튼
  btnShareStory.addEventListener('click', async () => {
    if (lastResultType === 'photo' && lastCapturedBlob) {
      const res = await share.shareImage(lastCapturedBlob, `kuid_standby_${Date.now()}.jpg`);
      if (res.method === 'web-share') {
        showToast('STORY SHARE SHEET OPENED');
      } else if (res.method === 'download') {
        showToast('IMAGE SAVED TO DEVICE');
      }
    } else if (lastResultType === 'video' && lastRecordedBlob) {
      const res = await share.shareVideo(lastRecordedBlob, `kuid_standby_${Date.now()}.${lastRecordedExt}`, lastRecordedMime);
      if (res.method === 'web-share') {
        showToast('STORY SHARE SHEET OPENED');
      } else if (res.method === 'download') {
        showToast('VIDEO SAVED TO DEVICE');
      }
    }
  });

  btnDownload.addEventListener('click', () => {
    if (lastResultType === 'photo' && lastCapturedDataUrl) {
      share.downloadImage(lastCapturedDataUrl, `kuid_standby_${Date.now()}.jpg`);
      showToast('IMAGE SAVED TO DEVICE');
    } else if (lastResultType === 'video' && lastRecordedBlob) {
      share.downloadVideo(lastRecordedBlob, `kuid_standby_${Date.now()}.${lastRecordedExt}`);
      showToast('VIDEO SAVED TO DEVICE');
    }
  });

  const closeResultModal = async () => {
    resultModal.classList.remove('active');

    if (previewVideo) {
      previewVideo.pause();
      try {
        previewVideo.removeAttribute('src');
        previewVideo.load();
      } catch (e) {}
    }

    isCapturing = false;
    isRecording = false;

    try {
      await camera.resumeCamera();
    } catch (e) {
      console.warn('카메라 재개 실패:', e);
    }

    if (!renderer.isRunning) {
      renderer.start(camera.isFrontCamera());
    }
  };

  btnRetake.addEventListener('click', closeResultModal);

  btnCopyHashtags.addEventListener('click', async () => {
    const ok = await share.copyHashtags();
    if (ok) {
      showToast('HASHTAGS COPIED TO CLIPBOARD');
    }
  });

  // 닫기 버튼 전용 터치 & 클릭 바인딩 (모바일 터치 씹힘 / 스크롤 제스처 충돌 완벽 차단)
  const bindFastTap = (btn, action) => {
    if (!btn) return;
    let handled = false;

    // 1. 모바일 touchend: 손가락을 떼는 순간 0ms 즉각 반응
    btn.addEventListener('touchend', (e) => {
      e.preventDefault();
      e.stopPropagation();
      handled = true;
      action();
      setTimeout(() => { handled = false; }, 350);
    }, { passive: false });

    // 2. 터치 시작 시 배경 스크롤/제스처 간섭 차단
    btn.addEventListener('touchstart', (e) => {
      e.stopPropagation();
    }, { passive: true });

    // 3. 데스크톱 마우스 클릭 및 포인터 이벤트
    btn.addEventListener('click', (e) => {
      e.preventDefault();
      e.stopPropagation();
      if (handled) return;
      action();
    });
  };

  // 17. 이벤트 안내 모달 (GUIDE 버튼)
  const openEventModal = () => {
    const sheet = eventModal.querySelector('.modal-sheet');
    if (sheet) sheet.scrollTop = 0;
    eventModal.classList.add('active');
  };
  eventInfoBtn.addEventListener('click', openEventModal);

  const closeEventModal = () => {
    eventModal.classList.remove('active');
  };
  bindFastTap(closeEventModalBtn, closeEventModal);
  bindFastTap(closeEventModalTopBtn, closeEventModal);

  btnGoInstagram.addEventListener('click', () => {
    share.openInstagramAccount();
  });

  // 18. 졸업전시 주제 및 컨셉 소개 모달 (KUID GRADUATION 버튼 - 전체 페이지 슬라이드)
  const closeAboutModalTopBtn = document.getElementById('close-about-modal-top');
  const scrollToStatementBtn = document.getElementById('scroll-to-statement-btn');
  const aboutPagesSlider = document.getElementById('about-pages-slider');

  let currentAboutPage = 0;
  let isAboutAnimating = false;

  const setAboutPage = (pageIdx, animate = true) => {
    if (pageIdx < 0) pageIdx = 0;
    if (pageIdx > 1) pageIdx = 1;
    currentAboutPage = pageIdx;
    if (!aboutPagesSlider) return;

    if (!animate) {
      aboutPagesSlider.style.transition = 'none';
      aboutPagesSlider.style.transform = `translateY(-${pageIdx * 100}%)`;
      void aboutPagesSlider.offsetHeight; // force reflow
    } else {
      aboutPagesSlider.style.transition = 'transform 0.55s cubic-bezier(0.22, 1, 0.36, 1)';
      aboutPagesSlider.style.transform = `translateY(-${pageIdx * 100}%)`;
      isAboutAnimating = true;
      setTimeout(() => {
        isAboutAnimating = false;
      }, 560);
    }
  };

  const openAboutModal = () => {
    setAboutPage(0, false);
    aboutModal.classList.add('active');
  };
  brandBadge.addEventListener('click', openAboutModal);

  const closeAboutModal = () => {
    aboutModal.classList.remove('active');
  };
  bindFastTap(closeAboutModalBtn, closeAboutModal);
  bindFastTap(closeAboutModalTopBtn, closeAboutModal);

  if (scrollToStatementBtn) {
    scrollToStatementBtn.addEventListener('click', (e) => {
      e.preventDefault();
      e.stopPropagation();
      setAboutPage(1, true);
    });
  }

  // 모바일 터치 제스처: 조금만 쓸어올리거나 내려도 한번에 쑤욱 다음/이전 페이지로 전환
  let touchStartY = null;
  let touchStartX = null;
  let touchHandled = false;

  aboutModal.addEventListener('touchstart', (e) => {
    if (!aboutModal.classList.contains('active')) return;
    if (e.target.closest('#close-about-modal-top')) return;
    if (e.touches && e.touches.length === 1) {
      touchStartY = e.touches[0].clientY;
      touchStartX = e.touches[0].clientX;
      touchHandled = false;
    }
  }, { passive: true });

  aboutModal.addEventListener('touchmove', (e) => {
    if (!aboutModal.classList.contains('active')) return;
    if (touchStartY === null || touchHandled || isAboutAnimating) return;

    const currentY = e.touches[0].clientY;
    const currentX = e.touches[0].clientX;
    const diffY = touchStartY - currentY; // 양수면 위로 쓸어올림(다음 페이지)
    const diffX = touchStartX - currentX;

    // 수직 스와이프 의도가 뚜렷할 때 (28px 이상 이동)
    if (Math.abs(diffY) > 28 && Math.abs(diffY) > Math.abs(diffX)) {
      touchHandled = true;
      if (diffY > 0 && currentAboutPage === 0) {
        // 위로 쓸어올림 -> 2페이지(서문)로 한번에 쑤욱 이동
        setAboutPage(1, true);
      } else if (diffY < 0 && currentAboutPage === 1) {
        // 아래로 쓸어내림 -> 1페이지(포스터)로 한번에 쑤욱 이동
        setAboutPage(0, true);
      }
    }
  }, { passive: true });

  aboutModal.addEventListener('touchend', () => {
    touchStartY = null;
    touchStartX = null;
    touchHandled = false;
  }, { passive: true });

  // 마우스 휠 / 트랙패드 제스처: 휠 한 번에 전체 1페이지씩 쑤욱 이동
  aboutModal.addEventListener('wheel', (e) => {
    if (!aboutModal.classList.contains('active')) return;
    e.preventDefault();
    if (isAboutAnimating) return;

    if (e.deltaY > 15 && currentAboutPage === 0) {
      setAboutPage(1, true);
    } else if (e.deltaY < -15 && currentAboutPage === 1) {
      setAboutPage(0, true);
    }
  }, { passive: false });

  // 키보드 방향키 제스처
  window.addEventListener('keydown', (e) => {
    if (!aboutModal.classList.contains('active')) return;
    if (e.key === 'ArrowDown' || e.key === 'PageDown') {
      e.preventDefault();
      if (currentAboutPage === 0 && !isAboutAnimating) setAboutPage(1, true);
    } else if (e.key === 'ArrowUp' || e.key === 'PageUp') {
      e.preventDefault();
      if (currentAboutPage === 1 && !isAboutAnimating) setAboutPage(0, true);
    } else if (e.key === 'Escape') {
      closeAboutModal();
    }
  });

  if (btnAboutInstagram) {
    btnAboutInstagram.addEventListener('click', () => {
      share.openInstagramAccount();
    });
  }

  // 모달 배경(바깥 영역) 클릭 시 닫기
  [resultModal, eventModal, aboutModal].forEach(modal => {
    if (!modal) return;
    modal.addEventListener('click', (e) => {
      if (e.target === modal) {
        if (modal === resultModal) {
          closeResultModal();
        } else {
          modal.classList.remove('active');
        }
      }
    });
  });
});
