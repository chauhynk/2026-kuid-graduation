/**
 * Camera Module - 모바일 카메라 스트림 제어
 */
class CameraController {
  constructor(videoElement) {
    this.video = videoElement;
    this.stream = null;
    this.facingMode = 'user'; // 'user' (전면) or 'environment' (후면)
    this.isReady = false;
  }

  /**
   * 카메라 스트림 초기화 및 시작
   */
  async startCamera(facingMode = this.facingMode) {
    this.facingMode = facingMode;
    this.stopStream();

    const constraints = {
      audio: false,
      video: {
        facingMode: { ideal: this.facingMode },
        width: { ideal: 1920 },
        height: { ideal: 1080 }
      }
    };

    try {
      if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
        throw new Error('이 브라우저는 카메라 스트림을 지원하지 않습니다.');
      }

      this.stream = await navigator.mediaDevices.getUserMedia(constraints);
      this.video.srcObject = this.stream;
      this.video.setAttribute('playsinline', 'true');
      this.video.setAttribute('webkit-playsinline', 'true');
      this.video.muted = true;

      await this.video.play();
      this.isReady = true;
      return true;
    } catch (err) {
      console.warn('기본 제약 조건 실패, 단순 비디오 요청 시도:', err);
      try {
        // 제약 조건 완화 후 재시도
        this.stream = await navigator.mediaDevices.getUserMedia({ video: true, audio: false });
        this.video.srcObject = this.stream;
        await this.video.play();
        this.isReady = true;
        return true;
      } catch (fallbackErr) {
        console.error('카메라 권한 획득 실패:', fallbackErr);
        throw fallbackErr;
      }
    }
  }

  /**
   * 카메라 전/후면 전환 (Flip)
   */
  async toggleFacingMode() {
    const nextMode = this.facingMode === 'user' ? 'environment' : 'user';
    await this.startCamera(nextMode);
    return this.facingMode;
  }

  /**
   * 카메라 스트림 상태 점검 및 재개 (멈춤 방지)
   */
  async resumeCamera() {
    try {
      if (this.stream && this.stream.active) {
        const tracks = this.stream.getVideoTracks();
        const activeTracks = tracks.filter(t => t.readyState === 'live' && t.enabled);
        
        if (activeTracks.length > 0) {
          if (this.video.paused) {
            await this.video.play();
          }
          this.isReady = true;
          return true;
        }
      }
      return await this.startCamera(this.facingMode);
    } catch (err) {
      console.warn('카메라 스트림 재개 실패, 재시작 시도:', err);
      return await this.startCamera(this.facingMode);
    }
  }

  /**
   * 스트림 중지
   */
  stopStream() {
    if (this.stream) {
      this.stream.getTracks().forEach(track => track.stop());
      this.stream = null;
    }
    this.isReady = false;
  }

  /**
   * 현재 전면 카메라 여부 반환
   */
  isFrontCamera() {
    return this.facingMode === 'user';
  }
}

window.CameraController = CameraController;
