/**
 * Audio Controller - 건국대학교 산디과 STANDBY BGM & 사운드 매니저
 * - "WERE EXPERIENCING TECHNICAL DIFFICULTIES... PLEASE STAND BY" 오디오 제어
 * - 모바일 Safari/Chrome 자동 재생 및 온/오프 토글 완벽 대응
 */
class AudioManager {
  constructor(audioSrc = 'assets/audio/standby_bgm.mp3') {
    this.audioSrc = audioSrc;
    this.audioElement = new Audio(audioSrc);
    this.audioElement.loop = true;
    this.audioElement.preload = 'auto';
    this.audioElement.volume = 1.0;
    this.audioElement.crossOrigin = 'anonymous';

    this.isPlaying = false;
    this.isMuted = false;
    this.audioCtx = null;
    this.destNode = null;
  }

  /**
   * BGM 재생 (사용자 제스처/클릭 시 즉시 시작)
   */
  async play() {
    if (this.isMuted) return false;
    try {
      this.audioElement.muted = false;
      await this.audioElement.play();
      this.isPlaying = true;
      return true;
    } catch (e) {
      console.warn('BGM 재생 대기 (터치 인터랙션 필요):', e);
      this.isPlaying = false;
      return false;
    }
  }

  /**
   * BGM 정지
   */
  pause() {
    this.audioElement.pause();
    this.isPlaying = false;
  }

  /**
   * BGM 온/오프 토글
   */
  toggle() {
    if (this.isPlaying) {
      this.pause();
      this.isMuted = true;
      return false; // OFF
    } else {
      this.isMuted = false;
      this.play();
      return true; // ON
    }
  }

  /**
   * 비디오 녹화용 오디오 트랙 생성 및 반환
   */
  getAudioTrack() {
    try {
      if (!this.audioCtx) {
        const AudioContext = window.AudioContext || window.webkitAudioContext;
        if (!AudioContext) return null;
        this.audioCtx = new AudioContext();
      }
      if (!this.destNode) {
        this.destNode = this.audioCtx.createMediaStreamDestination();
        const source = this.audioCtx.createMediaElementSource(this.audioElement);
        source.connect(this.audioCtx.destination);
        source.connect(this.destNode);
      }
      return this.destNode.stream.getAudioTracks()[0] || null;
    } catch (e) {
      console.warn('Web Audio 녹화 스트림 생성 fallback:', e);
      return null;
    }
  }
}

window.AudioManager = AudioManager;
