/**
 * Share Module - 인스타그램 공유, 이미지/영상 저장, 해시태그 복사
 */
class ShareManager {
  constructor(config) {
    this.config = config || window.APP_CONFIG;
  }

  /**
   * 인스타그램 스토리 또는 모바일 시스템 공유창 띄우기 (사진)
   */
  async shareImage(blob, filename = 'kuid_standby_story.jpg') {
    if (!blob) {
      throw new Error('공유할 이미지가 없습니다.');
    }

    const file = new File([blob], filename, { type: 'image/jpeg' });

    // Web Share API 및 파일 공유 지원 여부 확인
    if (navigator.canShare && navigator.canShare({ files: [file] })) {
      try {
        await navigator.share({
          files: [file],
          title: this.config.exhibition.title,
          text: `${this.config.exhibition.title}\n${this.config.exhibition.hashtags.join(' ')}`
        });
        return { success: true, method: 'web-share' };
      } catch (err) {
        if (err.name === 'AbortError') {
          return { success: false, aborted: true };
        }
        console.warn('Web Share 실패, 다운로드로 대체:', err);
      }
    }

    // 미지원 브라우저인 경우 일반 파일 다운로드 실행
    this.downloadImage(blob, filename);
    return { success: true, method: 'download' };
  }

  /**
   * 이미지 다운로드 저장
   */
  downloadImage(blobOrDataUrl, filename = 'kuid_standby_capture.jpg') {
    const url = typeof blobOrDataUrl === 'string' 
      ? blobOrDataUrl 
      : URL.createObjectURL(blobOrDataUrl);

    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);

    if (typeof blobOrDataUrl !== 'string') {
      setTimeout(() => URL.revokeObjectURL(url), 3000);
    }
  }

  /**
   * 인스타그램 스토리 또는 모바일 시스템 공유창으로 영상 공유
   */
  async shareVideo(blob, filename = 'kuid_standby_video.mp4', mimeType = 'video/mp4') {
    if (!blob) throw new Error('공유할 영상이 없습니다.');

    const file = new File([blob], filename, { type: mimeType });

    if (navigator.canShare && navigator.canShare({ files: [file] })) {
      try {
        await navigator.share({
          files: [file],
          title: this.config.exhibition.title,
          text: `${this.config.exhibition.title}\n${this.config.exhibition.hashtags.join(' ')}`
        });
        return { success: true, method: 'web-share' };
      } catch (err) {
        if (err.name === 'AbortError') {
          return { success: false, aborted: true };
        }
        console.warn('영상 Web Share 실패, 다운로드로 대체:', err);
      }
    }

    this.downloadVideo(blob, filename);
    return { success: true, method: 'download' };
  }

  /**
   * 영상 다운로드 저장
   */
  downloadVideo(blobOrUrl, filename = 'kuid_standby_video.mp4') {
    const url = typeof blobOrUrl === 'string'
      ? blobOrUrl
      : URL.createObjectURL(blobOrUrl);

    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);

    if (typeof blobOrUrl !== 'string') {
      setTimeout(() => URL.revokeObjectURL(url), 5000);
    }
  }

  /**
   * 이벤트 해시태그 클립보드 복사
   */
  async copyHashtags() {
    const text = this.config.exhibition.hashtags.join(' ');
    try {
      if (navigator.clipboard && navigator.clipboard.writeText) {
        await navigator.clipboard.writeText(text);
        return true;
      } else {
        const textArea = document.createElement('textarea');
        textArea.value = text;
        textArea.style.position = 'fixed';
        textArea.style.left = '-9999px';
        document.body.appendChild(textArea);
        textArea.focus();
        textArea.select();
        document.execCommand('copy');
        document.body.removeChild(textArea);
        return true;
      }
    } catch (err) {
      console.error('클립보드 복사 실패:', err);
      return false;
    }
  }

  /**
   * 인스타그램 공식 계정 열기
   */
  openInstagramAccount() {
    const webUrl = this.config.exhibition.instagramUrl || "https://www.instagram.com/kuid_graduation/";
    const handle = "kuid_graduation";
    const appUrl = `instagram://user?username=${handle}`;

    const start = Date.now();
    window.location.href = appUrl;
    setTimeout(() => {
      if (Date.now() - start < 1500) {
        window.open(webUrl, '_blank');
      }
    }, 500);
  }
}

window.ShareManager = ShareManager;
