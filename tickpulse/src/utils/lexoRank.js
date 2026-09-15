/**
 * 🎯 商業級防撞車 LexoRank 演算法
 * @param {string|null} prev - 左鄰居（確保已清洗，絕無 undefined）
 * @param {string|null} next - 右鄰居（確保已清洗，絕無 undefined）
 */
export function getLexoRankOrder(prev, next) {
  // 1. 處理極端邊界：兩邊都沒鄰居（清單只有一項）
  if (prev === null && next === null) return 'm';

  // 2. 處理拖曳到最頂端（沒有左鄰居）
  if (prev === null) {
    const firstChar = next.charCodeAt(0) || 122;
    if (firstChar > 97) { // 如果大於 'a'，就往前取一個字母
      return String.fromCharCode(firstChar - 1);
    }
    return String.fromCharCode(97) + next; // 如果已經是 'a' 了，就在前面墊 'a'
  }

  // 3. 處理拖曳到最底端（沒有右鄰居）
  if (next === null) {
    const lastChar = prev.charCodeAt(prev.length - 1) || 97;
    if (lastChar < 122) { // 如果小於 'z'，就往後取一個字母
      return prev.substring(0, prev.length - 1) + String.fromCharCode(lastChar + 1);
    }
    return prev + 'm'; // 如果已經是 'z'，才在後面墊 'm'
  }

  // 4. 🛡️ 異常防護：萬一因為系統亂序，導致左鄰居竟然大於或等於右鄰居
  if (prev.localeCompare(next) >= 0) {
    // 說明資料庫或前端陣列順序已經壞了，強行在右鄰居後面墊一個中間值 'm' 來打破僵局
    return next + 'm';
  }

  // 5. 正常夾在中間的計算 (Midpoint 計算)
  let result = '';
  let i = 0;
  
  while (true) {
    const charP = prev.charCodeAt(i) || 96;   // 降級為 'a' 的前一個
    const charN = next.charCodeAt(i) || 123;  // 降級為 'z' 的後一個
    
    if (charN - charP > 1) {
      const mid = Math.floor((charP + charN) / 2);
      result += String.fromCharCode(mid);
      break;
    } else {
      result += String.fromCharCode(charP);
      i++;
    }
  }
  
  // 🛡️ 終極杜絕重複防線
  if (result === prev || result === next) {
    result += 'm';
  }
  
  return result;
}