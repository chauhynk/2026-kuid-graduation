/**
 * FilterRenderer Module - 비디오 및 PNG/SVG 프레임 실시간 캔버스 합성 엔진 (사진 & 영상 녹화 지원)
 */
class FilterRenderer {
  constructor(canvasElement, videoElement, config) {
    this.canvas = canvasElement;
    this.ctx = this.canvas.getContext('2d', { willReadFrequently: false });
    this.video = videoElement;
    this.config = config || window.APP_CONFIG;
    
    this.frameImages = new Map();
    this.currentFrameId = this.config.frames[0]?.id || null;
    this.currentColorFilter = 'none';
    
    this.customUploadedImage = null;
    this.isFrontCamera = true;
    this.animationFrameId = null;
    this.isRunning = false;

    // 영상 녹화 관련
    this.mediaRecorder = null;
    this.recordedChunks = [];
    this.recordedMimeType = 'video/mp4';
    this.isRecording = false;

    // 타겟 해상도 (기본 1080x1920)
    this.targetWidth = this.config.targetWidth || 1080;
    this.targetHeight = this.config.targetHeight || 1920;

    this.initCanvasSize();
    this.preloadFrames();
  }

  /**
   * 캔버스 기본 해상도 초기화
   */
  initCanvasSize() {
    this.canvas.width = this.targetWidth;
    this.canvas.height = this.targetHeight;
  }

  /**
   * config.js에 등록된 모든 PNG/SVG 프레임 에셋 사전 로드
   */
  async preloadFrames() {
    const promises = this.config.frames.map(frame => {
      return new Promise((resolve) => {
        const img = new Image();
        img.crossOrigin = 'anonymous';
        img.onload = () => {
          this.frameImages.set(frame.id, img);
          resolve(img);
        };
        img.onerror = () => {
          console.warn(`프레임 이미지 로드 실패: ${frame.src}`);
          resolve(null);
        };
        img.src = frame.src;
      });
    });

    await Promise.all(promises);
  }

  /**
   * 현재 활성화된 프레임 변경
   */
  setFrame(frameId) {
    this.currentFrameId = frameId;
    const frameObj = this.config.frames.find(f => f.id === frameId);
    if (frameObj && frameObj.colorEffect) {
      const preset = this.config.colorPresets.find(p => p.id === frameObj.colorEffect);
      this.currentColorFilter = preset ? preset.filter : 'none';
    }
  }

  /**
   * 색감 필터 변경
   */
  setColorFilter(filterString) {
    this.currentColorFilter = filterString || 'none';
  }

  /**
   * 갤러리 사진/영상 설정
   */
  setCustomImage(imgElement) {
    this.customUploadedImage = imgElement;
  }

  /**
   * 갤러리 사진/영상 해제 (실시간 카메라 복귀)
   */
  clearCustomImage() {
    this.customUploadedImage = null;
  }

  /**
   * 실시간 렌더링 루프 시작
   */
  start(isFrontCamera = true) {
    this.isFrontCamera = isFrontCamera;
    this.isRunning = true;

    const renderLoop = () => {
      if (!this.isRunning) return;
      this.render();
      this.animationFrameId = requestAnimationFrame(renderLoop);
    };

    renderLoop();
  }

  /**
   * 렌더링 루프 정지
   */
  stop() {
    this.isRunning = false;
    if (this.animationFrameId) {
      cancelAnimationFrame(this.animationFrameId);
      this.animationFrameId = null;
    }
  }

  /**
   * 1프레임 렌더링 (비디오 or 업로드 사진 + 색감 필터 + PNG/SVG 프레임 오버레이)
   */
  render() {
    const ctx = this.ctx;
    const cw = this.canvas.width;
    const ch = this.canvas.height;

    ctx.save();
    ctx.clearRect(0, 0, cw, ch);

    // 1. 소스 (카메라 비디오 또는 업로드된 이미지) 그리기
    const source = this.customUploadedImage || this.video;
    const hasSource = this.customUploadedImage 
      ? (source.width > 0 && source.height > 0)
      : (source.readyState >= 2 && source.videoWidth > 0);

    if (hasSource) {
      const srcWidth = this.customUploadedImage ? source.naturalWidth || source.width : source.videoWidth;
      const srcHeight = this.customUploadedImage ? source.naturalHeight || source.height : source.videoHeight;

      // Center-crop (Cover) 계산
      const canvasRatio = cw / ch;
      const srcRatio = srcWidth / srcHeight;
      let drawW, drawH, sx, sy;

      if (srcRatio > canvasRatio) {
        drawH = srcHeight;
        drawW = srcHeight * canvasRatio;
        sx = (srcWidth - drawW) / 2;
        sy = 0;
      } else {
        drawW = srcWidth;
        drawH = srcWidth / canvasRatio;
        sx = 0;
        sy = (srcHeight - drawH) / 2;
      }

      ctx.save();

      // 전면 카메라일 경우 좌우 미러링
      if (!this.customUploadedImage && this.isFrontCamera) {
        ctx.translate(cw, 0);
        ctx.scale(-1, 1);
      }

      // 색감 필터 적용
      if (this.currentColorFilter && this.currentColorFilter !== 'none') {
        ctx.filter = this.currentColorFilter;
      }

      ctx.drawImage(source, sx, sy, drawW, drawH, 0, 0, cw, ch);
      ctx.restore();
    } else {
      ctx.fillStyle = '#050507';
      ctx.fillRect(0, 0, cw, ch);
    }

    // 2. 선택된 PNG/SVG 키비주얼 프레임 오버레이 렌더링
    const frameImg = this.frameImages.get(this.currentFrameId);
    if (frameImg && frameImg.complete && frameImg.naturalWidth > 0) {
      ctx.drawImage(frameImg, 0, 0, cw, ch);
    }

    ctx.restore();
  }

  /**
   * 고화질 스냅샷 사진 캡처 (Blob 및 DataURL 생성)
   */
  async captureSnapshot() {
    this.render();

    return new Promise((resolve) => {
      this.canvas.toBlob((blob) => {
        const dataUrl = this.canvas.toDataURL('image/jpeg', 0.95);
        resolve({ blob, dataUrl });
      }, 'image/jpeg', 0.95);
    });
  }

  /**
   * 실시간 비디오(영상) 녹화 시작
   */
  startVideoRecording(audioStream = null) {
    if (this.mediaRecorder && this.mediaRecorder.state === 'recording') {
      return;
    }

    const stream = this.canvas.captureStream(30);
    if (audioStream) {
      const audioTracks = audioStream.getAudioTracks();
      if (audioTracks.length > 0) {
        stream.addTrack(audioTracks[0]);
      }
    }

    const candidates = [
      'video/mp4;codecs=avc1,mp4a.40.2',
      'video/mp4',
      'video/webm;codecs=vp9,opus',
      'video/webm;codecs=vp8,opus',
      'video/webm'
    ];

    let selectedMimeType = '';
    for (const type of candidates) {
      if (window.MediaRecorder && MediaRecorder.isTypeSupported(type)) {
        selectedMimeType = type;
        break;
      }
    }

    this.recordedChunks = [];
    try {
      this.mediaRecorder = new MediaRecorder(stream, selectedMimeType ? { mimeType: selectedMimeType } : {});
    } catch (e) {
      console.warn('기본 MediaRecorder 생성 실패, 옵션 없이 생성 시도:', e);
      this.mediaRecorder = new MediaRecorder(stream);
    }

    this.recordedMimeType = selectedMimeType || 'video/mp4';

    this.mediaRecorder.ondataavailable = (event) => {
      if (event.data && event.data.size > 0) {
        this.recordedChunks.push(event.data);
      }
    };

    this.mediaRecorder.start(100);
    this.isRecording = true;
  }

  /**
   * 비디오 녹화 중지 및 결과 Blob 반환
   */
  async stopVideoRecording() {
    return new Promise((resolve, reject) => {
      if (!this.mediaRecorder || this.mediaRecorder.state !== 'recording') {
        resolve(null);
        return;
      }

      this.mediaRecorder.onstop = () => {
        this.isRecording = false;
        const blob = new Blob(this.recordedChunks, { type: this.recordedMimeType });
        const videoUrl = URL.createObjectURL(blob);
        const ext = this.recordedMimeType.includes('mp4') ? 'mp4' : 'webm';
        resolve({ blob, videoUrl, ext, mimeType: this.recordedMimeType });
      };

      this.mediaRecorder.onerror = (err) => {
        reject(err);
      };

      this.mediaRecorder.stop();
    });
  }
}

window.FilterRenderer = FilterRenderer;
