/**
 * Audio Controller - 건국대학교 산디과 STANDBY BGM & 사운드 매니저
 * - "WERE EXPERIENCING TECHNICAL DIFFICULTIES... PLEASE STAND BY" 오디오 제어
 * - 비디오 녹화 시 Web Audio Stream을 비디오 스트림에 합성
 */
class AudioManager {
  constructor(audioSrc = 'assets/audio/standby_bgm.mp3') {
    this.audioSrc = audioSrc;
    this.audioElement = new Audio(audioSrc);
    this.audioElement.loop = true;
    this.audioElement.preload = 'auto';

    this.audioCtx = null;
    this.sourceNode = null;
    this.destNode = null;
    this.isPlaying = false;
    this.isMuted = false;
    this.isInitialized = false;
  }

  /**
   * 사용자 첫 인터랙션(터치/클릭) 시 Web Audio Context 초기화
   */
  initContext() {
    if (this.isInitialized) return;
    try {
      const AudioContext = window.AudioContext || window.webkitAudioContext;
      if (!AudioContext) return;

      this.audioCtx = new AudioContext();
      this.destNode = this.audioCtx.createMediaStreamDestination();
      this.sourceNode = this.audioCtx.createMediaElementSource(this.audioElement);

      // 스피커 출력 & 녹화 스트림 동시 연결
      this.sourceNode.connect(this.audioCtx.destination);
      this.sourceNode.connect(this.destNode);

      this.isInitialized = true;
    } catch (e) {
      console.warn('AudioContext 초기화 대기:', e);
    }
  }

  /**
   * BGM 재생
   */
  async play() {
    this.initContext();
    if (this.audioCtx && this.audioCtx.state === 'suspended') {
      await this.audioCtx.resume();
    }

    try {
      await this.audioElement.play();
      this.isPlaying = true;
      return true;
    } catch (e) {
      console.warn('자동 재생 정책으로 재생 대기:', e);
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
   * 음소거 토글
   */
  toggleMute() {
    this.isMuted = !this.isMuted;
    this.audioElement.muted = this.isMuted;
    return !this.isMuted;
  }

  /**
   * 녹화용 오디오 트랙 가져오기
   */
  getAudioTrack() {
    this.initContext();
    if (this.destNode && this.destNode.stream) {
      const tracks = this.destNode.stream.getAudioTracks();
      if (tracks.length > 0) return tracks[0];
    }
    return null;
  }
}

window.AudioManager = AudioManager;
