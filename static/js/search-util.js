/* ==========================================
   팩플로우 검색 유틸 — 초성 검색 + 하이라이트
   ========================================== */

var SearchUtil = (function(){

  // 한글 초성 추출
  var CHO = ['ㄱ','ㄲ','ㄴ','ㄷ','ㄸ','ㄹ','ㅁ','ㅂ','ㅃ','ㅅ','ㅆ','ㅇ','ㅈ','ㅉ','ㅊ','ㅋ','ㅌ','ㅍ','ㅎ'];

  function getChosung(str){
    if(!str) return '';
    var result = '';
    for(var i = 0; i < str.length; i++){
      var code = str.charCodeAt(i);
      if(code >= 0xAC00 && code <= 0xD7A3){
        var idx = Math.floor((code - 0xAC00) / 588);
        result += CHO[idx];
      } else {
        result += str.charAt(i);
      }
    }
    return result;
  }

  // 검색어가 초성만인지 확인
  function isChosungOnly(q){
    if(!q) return false;
    for(var i = 0; i < q.length; i++){
      var c = q.charAt(i);
      if(CHO.indexOf(c) < 0) return false;
    }
    return true;
  }

  /**
   * 문자열에서 검색어 매칭
   * @param {string} text - 원본 텍스트
   * @param {string} query - 검색어 (일반 또는 초성)
   * @returns {boolean}
   */
  function match(text, query){
    if(!query) return true;
    if(!text) return false;
    var t = String(text).toLowerCase();
    var q = String(query).toLowerCase().trim();

    // 일반 검색
    if(t.indexOf(q) >= 0) return true;

    // 초성 검색 (검색어가 초성으로만 구성됐을 때)
    if(isChosungOnly(q)){
      var cho = getChosung(t);
      if(cho.indexOf(q) >= 0) return true;
    }

    return false;
  }

  /**
   * HTML 안전 이스케이프
   */
  function escapeHtml(s){
    if(s == null) return '';
    return String(s)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#39;');
  }

  /**
   * 검색어 하이라이트 HTML 반환
   * @param {string} text
   * @param {string} query
   * @returns {string} - <mark> 태그로 감싼 HTML
   */
  function highlight(text, query){
    var escaped = escapeHtml(text);
    if(!query) return escaped;
    var q = String(query).trim();
    if(!q) return escaped;

    // 초성 검색이면 하이라이트 안 함 (원문에 없으므로)
    if(isChosungOnly(q)){
      // 초성 매칭 위치 찾기
      var cho = getChosung(text || '');
      var lowQ = q.toLowerCase();
      var idx = cho.toLowerCase().indexOf(lowQ);
      if(idx >= 0){
        var before = escapeHtml(text.substring(0, idx));
        var hit = escapeHtml(text.substring(idx, idx + q.length));
        var after = escapeHtml(text.substring(idx + q.length));
        return before + '<mark style="background:#FFF3C4;color:#B45309;padding:0 2px;border-radius:2px">' + hit + '</mark>' + after;
      }
      return escaped;
    }

    // 일반 하이라이트 (대소문자 무시)
    try {
      var pattern = new RegExp('(' + q.replace(/[.*+?^${}()|[\]\\]/g, '\\$&') + ')', 'gi');
      return escaped.replace(pattern, '<mark style="background:#FFF3C4;color:#B45309;padding:0 2px;border-radius:2px">$1</mark>');
    } catch(e) {
      return escaped;
    }
  }

  /**
   * 최근 검색어 저장/로드
   */
  var HISTORY_KEY = 'ino_searchHist';
  var MAX_HISTORY = 10;

  function saveHistory(type, term){
    if(!term || term.length < 2) return;
    var hist = loadHistory();
    if(!hist[type]) hist[type] = [];
    // 중복 제거 + 맨 앞으로
    hist[type] = [term].concat(hist[type].filter(function(t){return t !== term}));
    hist[type] = hist[type].slice(0, MAX_HISTORY);
    try { localStorage.setItem(HISTORY_KEY, JSON.stringify(hist)); } catch(e){}
  }

  function loadHistory(){
    try { return JSON.parse(localStorage.getItem(HISTORY_KEY) || '{}'); }
    catch(e) { return {}; }
  }

  function getRecent(type){
    return loadHistory()[type] || [];
  }

  function clearHistory(type){
    var hist = loadHistory();
    if(type) delete hist[type];
    else hist = {};
    try { localStorage.setItem(HISTORY_KEY, JSON.stringify(hist)); } catch(e){}
  }

  /**
   * 디바운스 헬퍼
   */
  function debounce(fn, delay){
    var timer = null;
    return function(){
      var args = arguments, ctx = this;
      clearTimeout(timer);
      timer = setTimeout(function(){fn.apply(ctx, args)}, delay || 200);
    };
  }

  return {
    match: match,
    highlight: highlight,
    getChosung: getChosung,
    isChosungOnly: isChosungOnly,
    saveHistory: saveHistory,
    getRecent: getRecent,
    clearHistory: clearHistory,
    debounce: debounce
  };
})();
