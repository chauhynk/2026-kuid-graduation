/**
 * 건국대학교 산업디자인학과 졸업전시 인스타그램 이벤트 웹 필터 설정 파일
 */

window.APP_CONFIG = {
  // 🎓 졸업전시 기본 정보
  exhibition: {
    title: "2026 KUID GRADUATION SHOW // STANDBY",
    department: "건국대학교 산업디자인학과",
    theme: "STANDBY // CALIBRATION ARCHIVE",
    instagramId: "@kuid_graduation",
    instagramUrl: "https://www.instagram.com/kuid_graduation/",
    hashtags: ["#건국대산디", "#건대산디졸전", "#STANDBY", "#kuid_graduation"]
  },

  // 📋 이벤트 미션: 5가지 STANDBY 상황
  standbyMissions: [
    { id: "a", title: "7층 엘리베이터 기다리며 STANDBY", tag: "MISSION A" },
    { id: "b", title: "발표 시작 전 STANDBY", tag: "MISSION B" },
    { id: "c", title: "교수님께 피드백 받기 전 STANDBY", tag: "MISSION C" },
    { id: "d", title: "배달 시키고 과방에서 STANDBY", tag: "MISSION D" },
    { id: "e", title: "과제 시작 전 STANDBY", tag: "MISSION E" }
  ],

  // 🖼️ 프레임 설정: 사용자가 전달한 공식 키비주얼 단일 적용
  frames: [
    {
      id: "kuid_standby_kv",
      name: "STANDBY KV",
      code: "01",
      src: "assets/frames/kuid_standby_frame.png",
      description: "KUID STANDBY OFFICIAL KEY VISUAL",
      colorEffect: "none"
    }
  ],

  // ⚙️ 기본 설정
  defaultRatio: "9:16",
  targetWidth: 1080,
  targetHeight: 1920
};
