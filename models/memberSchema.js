const { Schema, model } = require("mongoose");

const memberSchema = new Schema({
  nickName: { // 닉네임
    type: String,
    required: true,
    unique: true,
  },
  grade: { // 직위
    type: String,
    required: true,
  },
  job: { // 직업
    type: String,
    required: true,
  },
  subChar: [], // 부캐 목록
  guildContents: [
    {
      time: {
        type: String, // e.g., "n월 m주차"
        required: true,
      },
      participated: {
        type: Boolean, // Participation status
        required: true,
      }
    }
  ], // 길드컨텐츠 참여내역을 배열로 정의
  warned: { // 연속 길드컨텐츠 미참여 횟수
    type: Number,
    default: 0,
  },
});

module.exports = model("memberDB", memberSchema);
