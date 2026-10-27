/* ByRequest avatar engine, shared by the prototype and the pitch */
(function(){
"use strict";
/* ---------- colour helpers ---------- */
function rgb(h){var n=parseInt(h.slice(1),16);return [n>>16,n>>8&255,n&255]}
function hex(a){return "#"+a.map(function(v){v=Math.max(0,Math.min(255,Math.round(v)));return (v<16?"0":"")+v.toString(16)}).join("")}
function mix(a,b,t){var x=rgb(a),y=rgb(b);return hex([x[0]+(y[0]-x[0])*t,x[1]+(y[1]-x[1])*t,x[2]+(y[2]-x[2])*t])}
function lt(h,t){return mix(h,"#ffffff",t)}
function dk(h,t){return mix(h,"#000000",t)}

/* ---------- avatar data ---------- */
var SKIN=["#FBE3D3","#F5D3BC","#EFC2A0","#E2AD86","#D19A72","#BD8560","#A86F4C","#8E5A3B","#77492F","#603A25","#4A2C1C","#382117"];
var HAIRC=["#1A1716","#3B271C","#6B4429","#9A6B43","#B8925C","#E1C48E","#EDE6D6","#8E3B20","#C2561F","#8E949B","#C9CDD2","#F29BB8","#5C7CFA","#B59CFF"];
var IRIS=["#5A3A22","#2A1A10","#8A6A2E","#4E7A4A","#4A78B8","#7A8894"];
var LIPS=[null,"#C9707A","#8E2F4F","#C99A86","#B3262E"];
var CLOTH=["#0E1013","#F2F1EC","#5B4BFF","#2F7BE0","#0B8A72","#7FB069","#E0502A","#F2B134","#E85D9A","#6B4226","#8E949B","#1F3A5F"];
var FRAME=["#14161A","#6B4226","#C9A45C","#DADCE0","#E0502A"];
var BG=["#DCE2FF","#FFE1D6","#D7EFE8","#FFF1CF","#ECE3FF","#DFEEFF","#EFE8DC","#F3E9E1","#E4EBE1","#D5F1F2","#1E2A4A","#16181D"];
var LIST={
  shape:[["oval","Oval"],["round","Round"],["square","Square"],["heart","Heart"],["long","Long"],["diamond","Diamond"]],
  hair:[["bald","Bald"],["buzz","Buzz cut"],["crew","Crew cut"],["crop","Textured crop"],["side","Side part"],["quiff","Quiff"],["undercut","Undercut"],["mullet","Mullet"],["curly","Short curls"],["afro","Afro"],["locs","Locs"],["braids","Braids"],["pixie","Pixie"],["bob","Bob"],["long","Long straight"],["wavy","Long waves"],["bun","Top bun"],["ponytail","Ponytail"]],
  eyes:[["round","Round"],["almond","Almond"],["lashes","Lashes"],["smile","Smiling"],["wink","Wink"],["sleepy","Relaxed"]],
  brows:[["straight","Straight"],["soft","Soft arch"],["high","High arch"],["thick","Thick"],["thin","Thin"],["angled","Angled"]],
  nose:[["button","Button"],["straight","Straight"],["wide","Wide"],["round","Round"]],
  mouth:[["smile","Smile"],["grin","Big smile"],["soft","Soft"],["neutral","Neutral"],["smirk","Smirk"],["laugh","Laugh"]],
  facial:[["none","None"],["stubble","Stubble"],["short","Short beard"],["full","Full beard"],["goatee","Goatee"],["moustache","Moustache"],["chinstrap","Chin strap"]],
  glasses:[["none","None"],["round","Round"],["square","Square"],["cateye","Cat eye"],["aviator","Aviator"],["shades","Sunglasses"],["oversized","Oversized"]],
  hat:[["none","None"],["cap","Cap"],["backcap","Cap, backwards"],["beanie","Beanie"],["bucket","Bucket hat"],["headband","Headband"],["hijab","Hijab"],["durag","Durag"]],
  top:[["tee","T-shirt"],["shirt","Shirt"],["hoodie","Hoodie"],["sweater","Sweater"],["turtle","Turtleneck"],["jacket","Jacket"]],
  ears:[["none","None"],["studs","Studs"],["hoops","Hoops"]]
};
var DEF={shape:"oval",skin:3,hair:"crop",hairC:1,eyes:"round",iris:0,brows:"soft",nose:"button",mouth:"smile",lips:0,facial:"none",glasses:"none",frame:0,hat:"none",hatC:0,top:"hoodie",cloth:2,ears:"none",freckles:false,blush:true,bg:0};
var A=JSON.parse(JSON.stringify(DEF));

/* ---------- avatar geometry ---------- */
var HEAD={
  oval:{d:"M62 92A38 46 0 1 0 138 92A38 46 0 1 0 62 92Z",ex:[61,139]},
  round:{d:"M58 94A42 43 0 1 0 142 94A42 43 0 1 0 58 94Z",ex:[58,142]},
  square:{d:"M62 74C62 54 78 46 100 46C122 46 138 54 138 74L138 108C138 128 124 140 100 140C76 140 62 128 62 108Z",ex:[61,139]},
  heart:{d:"M60 80C60 54 78 44 100 44C122 44 140 54 140 80C140 106 124 130 100 140C76 130 60 106 60 80Z",ex:[60,140]},
  long:{d:"M64 90A36 50 0 1 0 136 90A36 50 0 1 0 64 90Z",ex:[63,137]},
  diamond:{d:"M100 44C118 44 132 60 138 84C142 104 126 130 100 140C74 130 58 104 62 84C68 60 82 44 100 44Z",ex:[62,138]}
};
var HF={ /* hair front paths */
  buzz:"M62 86C62 56 80 44 100 44C120 44 138 56 138 86C132 66 118 58 100 58C82 58 68 66 62 86Z",
  crew:"M60 84C58 52 78 40 100 40C122 40 142 52 140 84C134 66 120 58 100 58C80 58 66 66 60 84Z",
  crop:"M58 92C54 50 76 36 100 36C124 36 146 50 142 92C138 74 128 64 116 62C108 70 92 72 78 66C68 70 62 80 58 92Z",
  side:"M57 94C50 52 78 34 104 36C130 38 150 58 143 94C141 76 136 66 128 60C110 68 88 58 72 64C64 72 60 82 57 94Z",
  quiff:"M60 88C56 56 70 40 88 33C102 24 128 22 139 40C146 54 142 74 140 88C134 70 122 62 104 60C84 60 68 70 60 88Z",
  undercut:"M64 72C66 48 82 36 100 36C120 36 136 48 138 72C130 62 116 58 100 58C84 58 72 62 64 72Z",
  mullet:"M58 90C54 50 76 36 100 36C124 36 146 50 142 90C138 74 128 64 116 62C108 70 92 72 78 66C68 70 62 78 58 90Z",
  afro:"M60 86C60 60 78 50 100 50C122 50 140 60 140 86C144 66 136 50 120 44C108 38 92 38 80 44C64 50 56 66 60 86Z",
  locs:"M60 88C58 52 78 38 100 38C122 38 142 52 140 88C134 66 118 56 100 56C82 56 66 66 60 88Z",
  braids:"M60 88C58 52 78 38 100 38C122 38 142 52 140 88C134 66 116 54 100 54C84 54 66 66 60 88Z",
  pixie:"M58 90C54 52 78 36 102 36C126 36 146 52 142 86C136 72 126 64 112 62C100 74 80 76 66 70C62 76 60 82 58 90Z",
  bob:"M56 96C52 52 78 34 104 36C128 38 148 56 144 96C140 78 134 66 124 62C104 74 80 66 66 72C60 80 58 88 56 96Z",
  long:"M58 92C56 50 78 34 100 34C122 34 144 50 142 92C136 70 120 58 100 56C80 58 64 70 58 92Z",
  wavy:"M58 92C56 50 78 34 100 34C122 34 144 50 142 92C138 74 126 60 108 58C104 64 96 66 90 60C76 64 64 74 58 92Z",
  bun:"M61 86C61 56 80 44 100 44C120 44 139 56 139 86C132 66 118 58 100 58C82 58 68 66 61 86Z",
  ponytail:"M61 86C61 56 80 44 100 44C120 44 139 56 139 86C132 66 118 58 100 58C82 58 68 66 61 86Z"
};
function hairBack(o,g){
  var h=o.hair,s="";
  if(h==="long") s='<path d="M58 86C56 46 78 30 100 30C122 30 144 46 142 86L146 168C134 176 122 172 118 160L118 130L82 130L82 160C78 172 66 176 54 168Z" fill="'+g+'"/>';
  if(h==="wavy") s='<path d="M58 86C56 46 78 30 100 30C122 30 144 46 142 86L150 158Q146 172 136 166Q128 178 120 166L118 130L82 130L80 166Q72 178 64 166Q54 172 50 158Z" fill="'+g+'"/>';
  if(h==="bob") s='<path d="M56 88C54 46 78 32 100 32C122 32 146 46 144 88L147 132C141 141 128 141 122 134L122 118L78 118L78 134C72 141 59 141 53 132Z" fill="'+g+'"/>';
  if(h==="afro"){s='<circle cx="100" cy="72" r="60" fill="'+g+'"/>';for(var i=0;i<14;i++){var a=i/14*Math.PI*2,x=100+Math.cos(a)*56,y=72+Math.sin(a)*56;if(y<118)s+='<circle cx="'+x.toFixed(1)+'" cy="'+y.toFixed(1)+'" r="12" fill="'+g+'"/>'}}
  if(h==="locs"||h==="braids"){[52,62,72,128,138,148].forEach(function(x,i){var len=[150,162,156,158,164,150][i];if(h==="locs")s+='<rect x="'+(x-5)+'" y="66" width="10" height="'+(len-66)+'" rx="5" fill="'+g+'"/>';else{for(var y=70;y<len;y+=9)s+='<ellipse cx="'+x+'" cy="'+y+'" rx="5" ry="5.6" fill="'+g+'"/>'}})}
  if(h==="ponytail") s='<path d="M128 58C162 56 172 100 160 152C154 164 142 160 144 148C152 110 148 84 126 74Z" fill="'+g+'"/>';
  if(h==="mullet") s='<path d="M60 90L58 142C68 152 80 148 82 136L82 120L118 120L118 136C120 148 132 152 142 142L140 90Z" fill="'+g+'"/>';
  if(h==="bun") s='<circle cx="100" cy="32" r="17" fill="'+g+'"/><path d="M90 30q10-8 20 0" fill="none" stroke="rgba(0,0,0,.15)" stroke-width="2"/>';
  return s;
}
function shoulders(o,id,ghost){
  var cl=ghost?"#DADAD4":CLOTH[o.cloth],g='url(#'+id+'cl)',dkc=dk(cl,.22),base='<path d="M24 206C28 166 60 150 100 150S172 166 176 206Z" fill="'+(ghost?cl:g)+'"/>',s=base,t=o.top;
  if(ghost) return base;
  if(t==="tee") s+='<path d="M82 151Q100 165 118 151" fill="none" stroke="'+dkc+'" stroke-width="5" stroke-linecap="round"/>';
  if(t==="shirt"){var cc=o.cloth===1?"#FFFFFF":lt(cl,.85);s+='<path d="M100 172V206" stroke="'+dkc+'" stroke-width="1.6"/><circle cx="100" cy="182" r="1.8" fill="'+dkc+'"/><circle cx="100" cy="194" r="1.8" fill="'+dkc+'"/><path d="M84 148L100 172L90 180L74 156Z" fill="'+cc+'" stroke="'+dk(cc,.15)+'" stroke-width="1.2"/><path d="M116 148L100 172L110 180L126 156Z" fill="'+cc+'" stroke="'+dk(cc,.15)+'" stroke-width="1.2"/>'}
  if(t==="hoodie") s+='<path d="M64 158C68 138 132 138 136 158C126 168 112 172 100 172S74 168 64 158Z" fill="'+dkc+'"/><path d="M76 156C82 146 118 146 124 156C116 162 108 164 100 164S84 162 76 156Z" fill="'+dk(cl,.4)+'"/><path d="M92 166V188M108 166V188" stroke="'+lt(cl,.6)+'" stroke-width="2.4" stroke-linecap="round"/><circle cx="92" cy="189" r="2.4" fill="'+lt(cl,.6)+'"/><circle cx="108" cy="189" r="2.4" fill="'+lt(cl,.6)+'"/>';
  if(t==="sweater") s+='<path d="M82 151Q100 166 118 151" fill="none" stroke="'+dkc+'" stroke-width="8" stroke-linecap="round"/><path d="M82 151Q100 166 118 151" fill="none" stroke="'+lt(cl,.15)+'" stroke-width="8" stroke-dasharray="1.4 2.6" stroke-linecap="butt" opacity=".7"/>';
  if(t==="turtle") s+='<path d="M82 124H118V154Q100 162 82 154Z" fill="'+g+'"/><path d="M82 124H118V154Q100 162 82 154Z" fill="none" stroke="'+dkc+'" stroke-width="1"/>'+[86,90,94,98,102,106,110,114].map(function(x){return '<path d="M'+x+' 126V154" stroke="'+dkc+'" stroke-width="1" opacity=".45"/>'}).join("");
  if(t==="jacket") s+='<path d="M86 150L100 184L114 150Q100 156 86 150Z" fill="#F2F1EC"/><path d="M86 150L100 184L94 206H72C70 184 74 164 86 150Z" fill="'+dk(cl,.12)+'"/><path d="M114 150L100 184L106 206H128C130 184 126 164 114 150Z" fill="'+dk(cl,.12)+'"/><path d="M86 150L96 172L88 176Z M114 150L104 172L112 176Z" fill="'+dk(cl,.3)+'"/>';
  return s;
}
function brows(o,c){
  var d={straight:"M78 85L94 84",soft:"M78 86Q86 81 94 84",high:"M78 87Q85 77 94 83",thick:"M78 86Q86 80 94 84",thin:"M79 86Q86 82 93 84",angled:"M78 87L88 81L95 84"}[o.brows];
  var w={straight:3.6,soft:3.6,high:3.4,thick:6,thin:2.2,angled:3.6}[o.brows];
  var p='<path d="'+d+'" fill="none" stroke="'+c+'" stroke-width="'+w+'" stroke-linecap="round" stroke-linejoin="round"/>';
  return p+'<g transform="translate(200 0) scale(-1 1)">'+p+'</g>';
}
function eyes(o,sk){
  var ir=IRIS[o.iris],ink="#16181C",s="",e=o.eyes;
  function open(cx,lash,almond){var sc=almond?'<path d="M'+(cx-7)+' 96Q'+cx+' 89 '+(cx+7)+' 96Q'+cx+' 101 '+(cx-7)+' 96Z" fill="#fff"/>':'<ellipse cx="'+cx+'" cy="96" rx="6" ry="5.4" fill="#fff"/>';
    return sc+'<circle cx="'+cx+'" cy="96.4" r="3.7" fill="'+ir+'"/><circle cx="'+cx+'" cy="96.4" r="1.8" fill="'+ink+'"/><circle cx="'+(cx-1.3)+'" cy="95" r="1.1" fill="#fff"/>'+
      '<path d="M'+(cx-7)+' '+(almond?95.6:95)+'Q'+cx+' '+(almond?88.6:89.4)+' '+(cx+7)+' '+(almond?95.6:95)+'" fill="none" stroke="'+ink+'" stroke-width="'+(lash?2.4:1.7)+'" stroke-linecap="round"/>'+
      (lash?'<path d="M'+(cx+5)+' 91.6l3-2.4M'+(cx+6.6)+' 93.6l3.4-1.2" stroke="'+ink+'" stroke-width="1.6" stroke-linecap="round"/>':'')}
  function closed(cx){return '<path d="M'+(cx-6)+' 97Q'+cx+' 90 '+(cx+6)+' 97" fill="none" stroke="'+ink+'" stroke-width="2.6" stroke-linecap="round"/>'}
  if(e==="round") s=open(86)+open(114);
  if(e==="almond") s=open(86,false,true)+open(114,false,true);
  if(e==="lashes") s=open(86,true)+'<g transform="translate(200 0) scale(-1 1)">'+open(86,true)+'</g>';
  if(e==="smile") s=closed(86)+closed(114);
  if(e==="wink") s=open(86)+'<path d="M108 96Q114 100 120 96" fill="none" stroke="'+ink+'" stroke-width="2.6" stroke-linecap="round"/>';
  if(e==="sleepy") s=open(86)+open(114)+'<path d="M79 96Q86 88 93 96Z M107 96Q114 88 121 96Z" fill="'+dk(sk,.06)+'"/><path d="M79 96H93M107 96H121" stroke="'+ink+'" stroke-width="1.8" stroke-linecap="round"/>';
  return s;
}
function nose(o,sk){
  var c=dk(sk,.28),n=o.nose,sh='<ellipse cx="100" cy="109" rx="7" ry="2.6" fill="'+dk(sk,.3)+'" opacity=".22"/>';
  if(n==="button") return sh+'<path d="M96.5 106.5Q100 110 103.5 106.5" fill="none" stroke="'+c+'" stroke-width="2.2" stroke-linecap="round"/><ellipse cx="99" cy="101" rx="2.2" ry="3" fill="#fff" opacity=".25"/>';
  if(n==="straight") return sh+'<path d="M101 92L98.5 105Q100 109 104 106.5" fill="none" stroke="'+c+'" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"/>';
  if(n==="wide") return sh+'<path d="M93.5 105.5Q96 109 100 108Q104 109 106.5 105.5" fill="none" stroke="'+c+'" stroke-width="2.2" stroke-linecap="round"/><circle cx="96.5" cy="106.4" r="1" fill="'+c+'"/><circle cx="103.5" cy="106.4" r="1" fill="'+c+'"/>';
  return sh+'<circle cx="100" cy="104.5" r="4.6" fill="'+lt(sk,.12)+'"/><path d="M95.6 106Q100 110 104.4 106" fill="none" stroke="'+c+'" stroke-width="2" stroke-linecap="round"/>';
}
function mouth(o,sk){
  var lc=LIPS[o.lips]||mix(dk(sk,.18),"#C4566A",.32),ink="#2A1416",m=o.mouth;
  if(m==="smile") return '<path d="M90 118Q100 128 110 118" fill="none" stroke="'+ink+'" stroke-width="2.6" stroke-linecap="round"/><path d="M94 123Q100 126 106 123" fill="none" stroke="'+lc+'" stroke-width="2.4" stroke-linecap="round" opacity=".7"/>';
  if(m==="grin") return '<path d="M88 116Q100 133 112 116Q100 120 88 116Z" fill="#fff" stroke="'+dk(lc,.2)+'" stroke-width="2.4" stroke-linejoin="round"/><path d="M90 117.4Q100 121 110 117.4" fill="none" stroke="#E8E4DE" stroke-width="1"/>';
  if(m==="soft") return '<path d="M91 119Q100 124 109 119" fill="none" stroke="'+lc+'" stroke-width="3.4" stroke-linecap="round"/>';
  if(m==="neutral") return '<path d="M90 119Q95 116 100 118Q105 116 110 119Q100 120.5 90 119Z" fill="'+dk(lc,.08)+'"/><path d="M90 119Q100 126.5 110 119Q100 121.5 90 119Z" fill="'+lt(lc,.08)+'"/><path d="M92 119.4H108" stroke="'+dk(lc,.4)+'" stroke-width="1"/>';
  if(m==="smirk") return '<path d="M92 120Q101 123 109 115" fill="none" stroke="'+ink+'" stroke-width="2.6" stroke-linecap="round"/>';
  return '<path d="M88 115Q100 135 112 115Q100 119 88 115Z" fill="#5A1E22" stroke="'+dk(lc,.2)+'" stroke-width="2" stroke-linejoin="round"/><ellipse cx="100" cy="126" rx="6" ry="3" fill="#E07A86"/><path d="M90 116.4Q100 120 110 116.4" fill="none" stroke="#fff" stroke-width="2.6" stroke-linecap="round"/>';
}
function facial(o,hc,sk){
  var f=o.facial,beard="M62 100C62 132 80 146 100 146C120 146 138 132 138 100C134 118 122 128 112 126Q100 122 88 126C78 128 66 118 62 100Z",full="M60 94C58 136 80 154 100 154C120 154 142 136 140 94C136 116 124 128 112 126Q100 122 88 126C76 128 64 116 60 94Z",mou="M86 113Q93 108 100 112Q107 108 114 113Q107 117 100 114Q93 117 86 113Z";
  if(f==="stubble") return '<path d="'+beard+'" fill="'+hc+'" opacity=".2"/><path d="'+mou+'" fill="'+hc+'" opacity=".2"/>';
  if(f==="short") return '<path d="'+beard+'" fill="'+hc+'" opacity=".9"/><path d="'+mou+'" fill="'+hc+'" opacity=".9"/>';
  if(f==="full") return '<path d="'+full+'" fill="url(#__H)"/><path d="'+mou+'" fill="url(#__H)"/>';
  if(f==="goatee") return '<path d="M90 125Q100 142 110 125Q100 129 90 125Z" fill="'+hc+'"/><path d="'+mou+'" fill="'+hc+'"/>';
  if(f==="moustache") return '<path d="'+mou+'" fill="'+hc+'"/>';
  if(f==="chinstrap") return '<path d="M63 104C66 132 82 144 100 144C118 144 134 132 137 104" fill="none" stroke="'+hc+'" stroke-width="4.4" stroke-linecap="round"/>';
  return "";
}
function glasses(o){
  var fc=FRAME[o.frame],g=o.glasses,lens="rgba(255,255,255,.22)",refl='<path d="M80 91l4-3M108 91l4-3" stroke="#fff" stroke-width="1.6" stroke-linecap="round" opacity=".7"/>';
  var arms='<path d="M74 93L62 90M126 93L138 90" stroke="'+fc+'" stroke-width="2.6" stroke-linecap="round"/>';
  if(g==="round") return '<circle cx="86" cy="96" r="10.5" fill="'+lens+'" stroke="'+fc+'" stroke-width="2.6"/><circle cx="114" cy="96" r="10.5" fill="'+lens+'" stroke="'+fc+'" stroke-width="2.6"/><path d="M96.5 95Q100 92.5 103.5 95" fill="none" stroke="'+fc+'" stroke-width="2.4"/>'+arms+refl;
  if(g==="square") return '<rect x="74" y="87" width="24" height="18" rx="4.5" fill="'+lens+'" stroke="'+fc+'" stroke-width="2.8"/><rect x="102" y="87" width="24" height="18" rx="4.5" fill="'+lens+'" stroke="'+fc+'" stroke-width="2.8"/><path d="M98 94H102" stroke="'+fc+'" stroke-width="2.6"/>'+arms+refl;
  if(g==="cateye") return '<path d="M73 89Q86 84 98 90Q98 104 87 105Q75 104 73 89Z" fill="'+lens+'" stroke="'+fc+'" stroke-width="2.8" stroke-linejoin="round"/><path d="M127 89Q114 84 102 90Q102 104 113 105Q125 104 127 89Z" fill="'+lens+'" stroke="'+fc+'" stroke-width="2.8" stroke-linejoin="round"/><path d="M98 93H102" stroke="'+fc+'" stroke-width="2.6"/>'+arms;
  if(g==="aviator") {var gc="#C9A45C";return '<defs><linearGradient id="__av" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#3A4A5C" stop-opacity=".85"/><stop offset="1" stop-color="#8FA5B8" stop-opacity=".55"/></linearGradient></defs><path d="M74 89Q86 86 97 89Q98 104 86 106Q74 104 74 89Z" fill="url(#__av)" stroke="'+gc+'" stroke-width="1.8"/><path d="M126 89Q114 86 103 89Q102 104 114 106Q126 104 126 89Z" fill="url(#__av)" stroke="'+gc+'" stroke-width="1.8"/><path d="M97 90H103M97 87H103" stroke="'+gc+'" stroke-width="1.6"/><path d="M74 91L62 89M126 91L138 89" stroke="'+gc+'" stroke-width="1.8"/>'+refl}
  if(g==="shades") return '<defs><linearGradient id="__sh" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#2A2D33"/><stop offset="1" stop-color="#0B0C0E"/></linearGradient></defs><path d="M72 88H98V96A10 10 0 0 1 88 106H82A10 10 0 0 1 72 96Z" fill="url(#__sh)" stroke="'+fc+'" stroke-width="2.4"/><path d="M102 88H128V96A10 10 0 0 1 118 106H112A10 10 0 0 1 102 96Z" fill="url(#__sh)" stroke="'+fc+'" stroke-width="2.4"/><path d="M98 91H102" stroke="'+fc+'" stroke-width="2.6"/>'+arms+'<path d="M77 92l7-3M107 92l7-3" stroke="#fff" stroke-width="1.8" opacity=".45" stroke-linecap="round"/>';
  if(g==="oversized") return '<rect x="70" y="84" width="28" height="25" rx="10" fill="'+lens+'" stroke="'+fc+'" stroke-width="3"/><rect x="102" y="84" width="28" height="25" rx="10" fill="'+lens+'" stroke="'+fc+'" stroke-width="3"/><path d="M98 93H102" stroke="'+fc+'" stroke-width="2.6"/>'+arms+refl;
  return "";
}
function hatBack(o,hc){
  if(o.hat==="hijab") return '<path d="M46 124C38 62 64 26 100 26S162 62 154 124L166 206H34Z" fill="url(#__T)"/>';
  if(o.hat==="durag") return '<path d="M130 72C152 92 154 132 148 166L136 164C140 134 136 104 122 84Z" fill="url(#__T)"/>';
  if(o.hat==="backcap") return '<path d="M118 46C138 38 158 42 166 52C152 56 138 56 124 56Z" fill="'+dk(CLOTH[o.hatC],.2)+'"/>';
  return "";
}
function hatFront(o){
  var c=CLOTH[o.hatC],d=dk(c,.22),l=lt(c,.25),h=o.hat;
  if(h==="cap") return '<path d="M58 82C58 50 78 36 100 36S142 50 142 82Z" fill="url(#__T)"/><path d="M100 36V80M78 44Q90 60 88 80M122 44Q110 60 112 80" fill="none" stroke="'+d+'" stroke-width="1.2" opacity=".5"/><circle cx="100" cy="37" r="3.6" fill="'+d+'"/><path d="M56 80C80 72 124 72 156 84C154 93 142 93 130 90C110 85 80 85 58 89Z" fill="'+d+'"/><path d="M60 82C82 76 122 76 152 85" fill="none" stroke="'+l+'" stroke-width="1.4" opacity=".6"/>';
  if(h==="backcap") return '<path d="M58 82C58 50 78 36 100 36S142 50 142 82Z" fill="url(#__T)"/><path d="M84 72H116V82H84Z" fill="'+d+'"/><path d="M88 76H112" stroke="'+l+'" stroke-width="1.6" stroke-dasharray="2 2"/><circle cx="100" cy="37" r="3.6" fill="'+d+'"/>';
  if(h==="beanie") return '<path d="M56 86C56 44 78 26 100 26S144 44 144 86Z" fill="url(#__T)"/><path d="M56 86C56 44 78 26 100 26S144 44 144 86Z" fill="url(#__K)" opacity=".55"/><rect x="53" y="70" width="94" height="20" rx="10" fill="'+d+'"/><rect x="53" y="70" width="94" height="20" rx="10" fill="url(#__K)" opacity=".7"/><circle cx="100" cy="24" r="10" fill="'+l+'"/><circle cx="97" cy="21" r="4" fill="#fff" opacity=".3"/>';
  if(h==="bucket") return '<path d="M66 72C66 44 82 36 100 36S134 44 134 72Z" fill="url(#__T)"/><path d="M46 80C58 64 142 64 154 80C150 90 50 90 46 80Z" fill="'+d+'"/><path d="M66 70Q100 62 134 70" fill="none" stroke="'+l+'" stroke-width="1.6" opacity=".6"/><path d="M50 80Q100 72 150 80" fill="none" stroke="'+l+'" stroke-width="1.2" stroke-dasharray="2 2.4" opacity=".7"/>';
  if(h==="headband") return '<path d="M60 64C80 54 120 54 140 64L141 75C120 66 80 66 59 75Z" fill="url(#__T)"/><path d="M62 67C82 59 118 59 138 67" fill="none" stroke="'+l+'" stroke-width="1.2" opacity=".7"/>';
  if(h==="hijab") return '<path d="M60 84C62 52 80 40 100 40S138 52 140 84C134 64 118 54 100 54S66 64 60 84Z" fill="url(#__T)"/><path d="M60 84C60 112 66 132 78 144L62 150C54 130 52 106 60 84ZM140 84C140 112 134 132 122 144L138 150C146 130 148 106 140 84Z" fill="url(#__T)"/><path d="M64 70Q100 48 136 70" fill="none" stroke="'+l+'" stroke-width="1.4" opacity=".5"/>';
  if(h==="durag") return '<path d="M60 86C58 50 78 38 100 38S142 50 140 86C130 72 118 68 100 68S70 72 60 86Z" fill="url(#__T)"/><path d="M72 52Q100 40 128 52" fill="none" stroke="#fff" stroke-width="3" opacity=".28" stroke-linecap="round"/>';
  return "";
}

var UID=0;
/* opts: {only:[layers], vb, ghost, nobg, patch} */
function avatarSVG(o,opts){
  opts=opts||{};
  var id="v"+(UID++),sk=SKIN[o.skin],hc=HAIRC[o.hairC],cl=CLOTH[o.cloth],ht=CLOTH[o.hatC],ghost=!!opts.ghost,only=opts.only,
      has=function(k){return !only||only.indexOf(k)>-1},
      gsk=ghost?"#E4E4DE":null,G=function(x){return x.replace(/__H/g,id+"h").replace(/__T/g,id+"t").replace(/__K/g,id+"k").replace(/__av/g,id+"av").replace(/__sh/g,id+"sh")};
  var hide=o.hat==="hijab";
  var defs='<defs><clipPath id="'+id+'c"><circle cx="100" cy="100" r="100"/></clipPath>'+
    '<radialGradient id="'+id+'s" cx="40%" cy="34%" r="72%"><stop offset="0" stop-color="'+lt(sk,.16)+'"/><stop offset=".55" stop-color="'+sk+'"/><stop offset="1" stop-color="'+dk(sk,.14)+'"/></radialGradient>'+
    '<linearGradient id="'+id+'h" x1="0" y1="0" x2=".55" y2="1"><stop offset="0" stop-color="'+lt(hc,.3)+'"/><stop offset=".45" stop-color="'+hc+'"/><stop offset="1" stop-color="'+dk(hc,.35)+'"/></linearGradient>'+
    '<linearGradient id="'+id+'cl" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="'+lt(cl,.14)+'"/><stop offset="1" stop-color="'+dk(cl,.24)+'"/></linearGradient>'+
    '<linearGradient id="'+id+'t" x1="0" y1="0" x2=".4" y2="1"><stop offset="0" stop-color="'+lt(ht,.2)+'"/><stop offset=".5" stop-color="'+ht+'"/><stop offset="1" stop-color="'+dk(ht,.28)+'"/></linearGradient>'+
    '<pattern id="'+id+'k" width="5" height="6" patternUnits="userSpaceOnUse"><path d="M1.2 0V6" stroke="'+dk(ht,.3)+'" stroke-width="1.4"/><path d="M3.8 0V6" stroke="'+lt(ht,.2)+'" stroke-width=".8"/></pattern>'+
    '<radialGradient id="'+id+'b" cx="50%" cy="30%" r="80%"><stop offset="0" stop-color="'+lt(BG[o.bg],.3)+'"/><stop offset="1" stop-color="'+BG[o.bg]+'"/></radialGradient>'+
    '<filter id="'+id+'f" x="-30%" y="-30%" width="160%" height="160%"><feGaussianBlur stdDeviation="3.5"/></filter></defs>';
  var s=[];
  if(opts.patch) s.push('<rect x="-50" y="-50" width="300" height="300" fill="url(#'+id+'s)"/>');
  else if(!opts.nobg) s.push('<rect width="200" height="200" fill="'+(opts.tilebg||'url(#'+id+'b)')+'"/>');
  var hairG='url(#'+id+'h)';
  if(has("backhair")&&!hide&&o.hat!=="durag"&&!(o.hat!=="none"&&o.hat!=="headband"&&(o.hair==="bun"||o.hair==="afro"))) s.push(hairBack(o,hairG));
  if(has("hatback")) s.push(G(hatBack(o)));
  if(has("body")) s.push(shoulders(o,id,ghost&&!(only&&only.indexOf("top")>-1)));
  if(has("neck")&&o.top!=="turtle") s.push('<path d="M86 116H114V156Q100 164 86 156Z" fill="'+(gsk||dk(sk,.1))+'"/>');
  if(has("ears")&&!hide){var ex=HEAD[o.shape].ex;s.push('<ellipse cx="'+ex[0]+'" cy="98" rx="7.5" ry="11" fill="'+(gsk||dk(sk,.08))+'"/><ellipse cx="'+ex[1]+'" cy="98" rx="7.5" ry="11" fill="'+(gsk||dk(sk,.08))+'"/>');
    if(!ghost&&o.ears==="studs") s.push('<circle cx="'+ex[0]+'" cy="108" r="2.4" fill="#E8C774"/><circle cx="'+ex[1]+'" cy="108" r="2.4" fill="#E8C774"/>');
    if(!ghost&&o.ears==="hoops") s.push('<circle cx="'+ex[0]+'" cy="114" r="6" fill="none" stroke="#D9B45A" stroke-width="2.2"/><circle cx="'+ex[1]+'" cy="114" r="6" fill="none" stroke="#D9B45A" stroke-width="2.2"/>');}
  if(has("head")){s.push('<path d="'+HEAD[o.shape].d+'" fill="'+(gsk||'url(#'+id+'s)')+'"/>');
    if(!ghost) s.push('<ellipse cx="100" cy="142" rx="24" ry="6" fill="'+dk(sk,.35)+'" opacity=".18" filter="url(#'+id+'f)"/>');}
  if(has("ao")&&!ghost&&HF[o.hair]&&o.hat==="none") s.push('<path d="'+HF[o.hair]+'" transform="translate(0 4)" fill="'+dk(sk,.4)+'" opacity=".22" filter="url(#'+id+'f)"/>');
  if(has("extras")&&!ghost){if(o.blush) s.push('<ellipse cx="78" cy="110" rx="7" ry="4.5" fill="#FF7E7E" opacity=".16"/><ellipse cx="122" cy="110" rx="7" ry="4.5" fill="#FF7E7E" opacity=".16"/>');
    if(o.freckles) s.push([[80,104],[84,107],[88,104],[78,108],[112,104],[116,107],[120,104],[122,108],[96,102],[104,102]].map(function(p){return '<circle cx="'+p[0]+'" cy="'+p[1]+'" r="1" fill="'+dk(sk,.38)+'" opacity=".6"/>'}).join(""));}
  if(has("facial")) s.push(G(facial(o,hc,sk)));
  var bc=o.hair==="bald"||o.hairC>=11?dk(sk,.5):(o.hairC===6||o.hairC===5?dk(hc,.35):hc);
  if(has("brows")) s.push(brows(o,bc));
  if(has("eyes")) s.push(eyes(o,sk));
  if(has("nose")) s.push(nose(o,sk));
  if(has("mouth")) s.push(mouth(o,sk));
  if(has("fronthair")&&HF[o.hair]&&!hide&&(o.hat==="none"||o.hat==="headband")){
    var hf=HF[o.hair];
    if(o.hair==="undercut") s.push('<path d="'+HF.buzz+'" fill="'+hc+'" opacity=".35"/>');
    if(o.hair==="curly"){var cs="";for(var i=0;i<=12;i++){var a=Math.PI*(1.02+i*.08),x=100+Math.cos(a)*40,y=84+Math.sin(a)*40;cs+='<circle cx="'+x.toFixed(1)+'" cy="'+y.toFixed(1)+'" r="12.5" fill="'+hairG+'"/>'}s.push(cs+'<ellipse cx="100" cy="58" rx="34" ry="18" fill="'+hairG+'"/>')}
    else s.push('<path d="'+hf+'" fill="'+hairG+'"/>');
    if(o.hair==="long"||o.hair==="wavy") s.push('<path d="M59 90C57 110 60 128 66 136C70 130 70 116 70 96Z M141 90C143 110 140 128 134 136C130 130 130 116 130 96Z" fill="'+hairG+'"/>');
    if(o.hair==="locs"||o.hair==="braids") s.push([64,136].map(function(x){return o.hair==="locs"?'<rect x="'+(x-4.5)+'" y="74" width="9" height="60" rx="4.5" fill="'+hairG+'"/>':[78,87,96,105,114,123].map(function(y){return '<ellipse cx="'+x+'" cy="'+y+'" rx="4.6" ry="5.2" fill="'+hairG+'"/>'}).join("")}).join(""));
    if(o.hair!=="buzz") s.push('<ellipse cx="84" cy="50" rx="16" ry="6" fill="#fff" opacity=".14" transform="rotate(-18 84 50)"/>');
  } else if(has("fronthair")&&!hide&&o.hat!=="none"&&(o.hair==="long"||o.hair==="wavy"||o.hair==="bob")&&o.hat!=="durag"){
    s.push('<path d="M59 84C57 108 60 128 66 136C70 130 70 116 70 90Z M141 84C143 108 140 128 134 136C130 130 130 116 130 90Z" fill="'+hairG+'"/>');
  }
  if(has("glasses")) s.push(G(glasses(o)));
  if(has("hat")) s.push(G(hatFront(o)));
  var vb=opts.vb||"0 0 200 200";
  return '<svg viewBox="'+vb+'" aria-hidden="true">'+defs+(opts.vb||opts.noclip?'<g>':'<g clip-path="url(#'+id+'c)">')+s.join("")+'</g></svg>';
}


var PRESETS={
 nightowl:{shape:"oval",skin:3,hair:"crop",hairC:1,eyes:"round",iris:0,brows:"soft",nose:"button",mouth:"smile",lips:0,facial:"stubble",glasses:"round",frame:0,hat:"none",hatC:0,top:"hoodie",cloth:2,ears:"none",freckles:false,blush:true,bg:4},
 milo:{shape:"square",skin:2,hair:"side",hairC:2,eyes:"almond",iris:3,brows:"straight",nose:"straight",mouth:"smirk",lips:0,facial:"none",glasses:"none",frame:0,hat:"cap",hatC:0,top:"tee",cloth:1,ears:"none",freckles:true,blush:false,bg:0},
 jens:{shape:"oval",skin:1,hair:"quiff",hairC:5,eyes:"round",iris:4,brows:"soft",nose:"button",mouth:"grin",lips:0,facial:"stubble",glasses:"none",frame:0,hat:"none",hatC:0,top:"jacket",cloth:11,ears:"studs",freckles:false,blush:true,bg:5},
 noah:{shape:"long",skin:8,hair:"curly",hairC:0,eyes:"smile",iris:1,brows:"thick",nose:"wide",mouth:"smile",lips:0,facial:"none",glasses:"none",frame:0,hat:"none",hatC:0,top:"sweater",cloth:4,ears:"none",freckles:false,blush:false,bg:2},
 sem:{shape:"round",skin:4,hair:"buzz",hairC:1,eyes:"round",iris:0,brows:"angled",nose:"round",mouth:"soft",lips:0,facial:"short",glasses:"none",frame:0,hat:"beanie",hatC:6,top:"hoodie",cloth:0,ears:"none",freckles:false,blush:false,bg:1},
 ava:{shape:"heart",skin:9,hair:"braids",hairC:0,eyes:"lashes",iris:1,brows:"high",nose:"wide",mouth:"grin",lips:2,facial:"none",glasses:"none",frame:0,hat:"none",hatC:0,top:"sweater",cloth:7,ears:"hoops",freckles:false,blush:true,bg:3},
 lina:{shape:"oval",skin:0,hair:"bob",hairC:7,eyes:"almond",iris:4,brows:"thin",nose:"button",mouth:"soft",lips:1,facial:"none",glasses:"cateye",frame:4,hat:"none",hatC:0,top:"turtle",cloth:9,ears:"studs",freckles:true,blush:true,bg:4},
 kai:{shape:"diamond",skin:6,hair:"undercut",hairC:13,eyes:"wink",iris:2,brows:"straight",nose:"straight",mouth:"laugh",lips:0,facial:"none",glasses:"shades",frame:0,hat:"none",hatC:0,top:"shirt",cloth:3,ears:"hoops",freckles:false,blush:false,bg:5},
 nour:{shape:"round",skin:5,hair:"bun",hairC:1,eyes:"sleepy",iris:0,brows:"soft",nose:"button",mouth:"smile",lips:3,facial:"none",glasses:"none",frame:0,hat:"hijab",hatC:4,top:"turtle",cloth:5,ears:"none",freckles:false,blush:true,bg:2},
 dre:{shape:"long",skin:10,hair:"bald",hairC:0,eyes:"round",iris:1,brows:"thick",nose:"round",mouth:"grin",lips:0,facial:"full",glasses:"square",frame:2,hat:"none",hatC:0,top:"shirt",cloth:1,ears:"none",freckles:false,blush:false,bg:1},
 ruby:{shape:"heart",skin:2,hair:"wavy",hairC:8,eyes:"lashes",iris:3,brows:"soft",nose:"button",mouth:"smile",lips:4,facial:"none",glasses:"none",frame:0,hat:"none",hatC:0,top:"tee",cloth:2,ears:"hoops",freckles:true,blush:true,bg:0},
 theo:{shape:"square",skin:7,hair:"locs",hairC:1,eyes:"round",iris:0,brows:"straight",nose:"wide",mouth:"smirk",lips:0,facial:"goatee",glasses:"none",frame:0,hat:"none",hatC:0,top:"hoodie",cloth:6,ears:"studs",freckles:false,blush:false,bg:3}
};
/* ---------- avatar studio, mounted inside any container ---------- */
var STABS=[["face","Face"],["hair","Hair"],["eyes","Eyes"],["brows","Brows"],["nose","Nose"],["mouth","Mouth"],["facial","Beard"],["glasses","Glasses"],["hat","Headwear"],["top","Clothes"],["extras","Extras"],["bg","Background"]];
function cl(o){return JSON.parse(JSON.stringify(o))}
function pk(a){return a[Math.floor(Math.random()*a.length)]}
function ri(n){return Math.floor(Math.random()*n)}
function generate(q){
  var pres=q.pres==="Man"?"m":q.pres==="Woman"?"w":q.pres==="Non-binary"?"nb":"any";
  var H={m:["buzz","crew","crop","side","quiff","undercut","curly","afro","locs","mullet","bald"],w:["long","wavy","bob","pixie","bun","ponytail","braids","curly","afro","locs"],nb:["pixie","mullet","undercut","bob","curly","crop","buzz","locs","wavy","bun","braids"],any:LIST.hair.map(function(h){return h[0]})}[pres];
  var L={Short:["bald","buzz","crew","crop","side","quiff","undercut","curly","pixie","afro"],Medium:["bob","mullet","curly","afro","locs","crop","side"],Long:["long","wavy","braids","ponytail","bun","locs"]}[q.len];
  var pool=L?H.filter(function(h){return L.indexOf(h)>-1}):H;if(!pool.length)pool=L||H;
  var grey=q.age==="45 to 54"?.35:q.age==="55+"?.7:0,fashion=q.age==="18 to 24"?.14:.05;
  var hairC=Math.random()<grey?pk([9,10,6]):Math.random()<fashion?pk([11,12,13]):pk([0,0,1,1,2,3,4,5,7,8]);
  var fh="none";if(q.facial==="Yes")fh=pk(["stubble","short","full","goatee","moustache"]);else if(q.facial==="Any"&&Math.random()<(pres==="m"?.55:pres==="nb"?.18:pres==="any"?.25:0))fh=pk(["stubble","short","full","goatee"]);
  var gl="none";if(q.glasses==="Yes")gl=pk(["round","square","cateye","aviator","oversized"]);else if(q.glasses==="Any"&&Math.random()<.3)gl=pk(["round","square","cateye"]);
  var ST={Casual:{top:["tee","sweater","hoodie"],hat:["none","none","beanie"]},Sporty:{top:["hoodie","tee"],hat:["cap","none","headband","backcap"]},Smart:{top:["shirt","turtle","jacket"],hat:["none"]},Street:{top:["hoodie","jacket","tee"],hat:["backcap","beanie","none"]},Artsy:{top:["sweater","turtle","shirt"],hat:["bucket","beanie","none"]}}[q.style]||{top:["tee"],hat:["none"]};
  var hat=pk(ST.hat);
  return {shape:pk(LIST.shape)[0],skin:q.skin>=0?q.skin:ri(SKIN.length),hair:pk(pool),hairC:hairC,eyes:pk(pres==="w"?["lashes","almond","round","smile"]:["round","almond","smile","sleepy","wink"]),iris:ri(IRIS.length),brows:pk(LIST.brows)[0],nose:pk(LIST.nose)[0],mouth:pk(["smile","smile","grin","soft","smirk","laugh"]),lips:pres==="w"&&Math.random()<.5?pk([1,2,3,4]):0,facial:fh,glasses:gl,frame:ri(FRAME.length),hat:hat,hatC:ri(CLOTH.length),top:pk(ST.top),cloth:ri(CLOTH.length),ears:Math.random()<(pres==="w"?.55:pres==="nb"?.4:.15)?pk(["studs","hoops"]):"none",freckles:Math.random()<.15,blush:Math.random()<.5,bg:ri(10)};
}
function studio(root,opts){
  opts=opts||{};
  var st={A:cl(opts.initial||DEF),tab:"face",photo:null,photoMode:false,m:(opts.looks&&opts.looks.length?"3d":"av"),look:0,blur:false,sheet:false,Q:{age:"25 to 34",pres:"Rather not say",len:"Surprise me",style:"Casual",facial:"Any",glasses:"Any",skin:-1},res:null};
  var TB="#F1F1EC";
  function variant(k,v){var o=cl(st.A);o[k]=v;return o}
  function tiles(k){return '<div class="st-tiles">'+LIST[k].map(function(it){var o=variant(k,it[0]),svg;
    if(k==="shape")svg=avatarSVG(o,{only:["head","ears"],vb:"44 36 112 112",tilebg:TB,noclip:true});
    else if(k==="hair")svg=avatarSVG(Object.assign(o,{hat:"none"}),{only:["backhair","body","neck","ears","head","fronthair"],ghost:true,tilebg:TB});
    else if(k==="eyes")svg=avatarSVG(o,{only:["eyes"],vb:"72 82 56 28",patch:true});
    else if(k==="brows")svg=avatarSVG(o,{only:["brows"],vb:"72 72 56 26",patch:true});
    else if(k==="nose")svg=avatarSVG(o,{only:["nose"],vb:"86 90 28 26",patch:true});
    else if(k==="mouth")svg=avatarSVG(o,{only:["mouth"],vb:"82 106 36 28",patch:true});
    else if(k==="facial")svg=avatarSVG(o,{only:["head","facial"],vb:"54 92 92 66",tilebg:TB,noclip:true});
    else if(k==="glasses")svg=avatarSVG(o,{only:["glasses"],vb:"56 78 88 36",tilebg:TB,noclip:true});
    else if(k==="hat")svg=avatarSVG(Object.assign(o,{hair:"bald"}),{only:["hatback","head","hat"],ghost:true,vb:"30 14 140 140",tilebg:TB,noclip:true});
    else if(k==="top")svg=avatarSVG(o,{only:["body","neck"],vb:"20 112 160 96",tilebg:TB,noclip:true});
    else svg=avatarSVG(o,{only:["ears"],vb:"40 82 50 44",tilebg:TB,noclip:true});
    var on=st.A[k]===it[0];return '<button class="st-tile'+(on?' on':'')+'" data-k="'+k+'" data-v="'+it[0]+'" aria-pressed="'+on+'">'+svg+'<span>'+it[1]+'</span></button>'}).join("")+'</div>'}
  function sw(k,arr,label){return '<div class="st-group"><h4>'+label+'</h4><div class="st-sw">'+arr.map(function(c,i){var on=st.A[k]===i;return '<button class="st-dot'+(on?' on':'')+'" style="background:'+(c||"linear-gradient(135deg,#E8B4A4,#C4566A)")+'" data-k="'+k+'" data-v="'+i+'" data-n="1" aria-label="'+label+' '+(i+1)+'" aria-pressed="'+on+'"></button>'}).join("")+'</div></div>'}
  function grp(title,k){return '<div class="st-group"><h4>'+title+'</h4>'+tiles(k)+'</div>'}
  function tog(k,b){return '<div class="st-row"><b>'+b+'</b><button class="st-tog'+(st.A[k]?' on':'')+'" data-t="'+k+'" role="switch" aria-checked="'+st.A[k]+'" aria-label="'+b+'"></button></div>'}
  function panel(){var t=st.tab;
    if(t==="face")return grp("Face shape","shape")+sw("skin",SKIN,"Skin tone");
    if(t==="hair")return grp("Hairstyle","hair")+sw("hairC",HAIRC,"Hair colour");
    if(t==="eyes")return grp("Eyes","eyes")+sw("iris",IRIS,"Eye colour");
    if(t==="brows")return grp("Eyebrows","brows");
    if(t==="nose")return grp("Nose","nose");
    if(t==="mouth")return grp("Mouth","mouth")+sw("lips",LIPS,"Lip colour");
    if(t==="facial")return grp("Facial hair","facial");
    if(t==="glasses")return grp("Glasses","glasses")+sw("frame",FRAME,"Frame colour");
    if(t==="hat")return grp("Headwear","hat")+sw("hatC",CLOTH,"Colour");
    if(t==="top")return grp("Clothes","top")+sw("cloth",CLOTH,"Colour");
    if(t==="extras")return grp("Earrings","ears")+'<div class="st-group">'+tog("freckles","Freckles")+tog("blush","Warm cheeks")+'</div>';
    return sw("bg",BG,"Background");}
  function q(key,label,list){return '<div class="st-q"><h4>'+label+'</h4><div class="st-chips">'+list.map(function(v){return '<button class="st-chip'+(st.Q[key]===v?' on':'')+'" data-q="'+key+'" data-v="'+v+'">'+v+'</button>'}).join("")+'</div></div>'}
  function sheet(){return '<div class="st-sheet"><div class="st-sheet-h"><b>Make me an avatar</b><button class="st-x" data-close="1" aria-label="Close">×</button></div>'+
    q("age","Age",["18 to 24","25 to 34","35 to 44","45 to 54","55+"])+q("pres","I present as",["Man","Woman","Non-binary","Rather not say"])+
    q("len","Hair length",["Short","Medium","Long","Surprise me"])+q("style","Style",["Casual","Sporty","Smart","Street","Artsy"])+
    '<button class="st-btn st-primary st-wide" data-gen="1">'+(st.res?"Try four more":"Create four avatars")+'</button>'+
    (st.res?'<div class="st-res">'+st.res.map(function(o,i){return '<button data-pick="'+i+'" aria-label="Choose avatar '+(i+1)+'">'+avatarSVG(o)+'</button>'}).join("")+'</div>':'')+'</div>'}
  function draw(){
    var tabsEl=root.querySelector(".st-tabs"),sl=tabsEl?tabsEl.scrollLeft:0,pn=root.querySelector(".st-panel"),ps=pn?pn.scrollTop:0;
    var face=st.photoMode&&st.photo?'<img src="'+st.photo+'" alt=""'+(st.blur?' class="blur"':'')+'>':avatarSVG(st.A);
    var LK=opts.looks||[], is3=st.m==="3d"&&LK.length>0;
    var modes='<div class="st-mode">'+(LK.length?'<button class="'+(is3?'on':'')+'" data-mode="3d">3D look</button>':'')+'<button class="'+(st.m==="av"?'on':'')+'" data-mode="av">Build</button><button class="'+(st.m==="ph"?'on':'')+'" data-mode="ph">Photo</button></div>';
    var body='<div class="st-stage"><div class="st-big">'+face+'</div>'+(st.photoMode?'':'<div class="st-actions"><button class="st-btn st-brand" data-surprise="1">Surprise me</button><button class="st-btn" data-shuffle="1">Shuffle</button></div>')+'</div>'+
      (st.photoMode?'<div class="st-panel"><label class="st-upload"><input type="file" accept="image/*" data-file="1"><b>Choose a photo</b><span>Your face is optional. A mood photo works too.</span></label><div class="st-group"><div class="st-row"><b>Blur my photo</b><button class="st-tog'+(st.blur?' on':'')+'" data-blur="1" role="switch" aria-checked="'+st.blur+'" aria-label="Blur my photo"></button></div></div><p class="st-note">Photos are reviewed before they go live.</p></div>':
      '<div class="st-tabs" role="tablist">'+STABS.map(function(t){return '<button role="tab" class="'+(st.tab===t[0]?'on':'')+'" data-tab="'+t[0]+'" aria-selected="'+(st.tab===t[0])+'">'+t[1]+'</button>'}).join("")+'</div><div class="st-panel">'+panel()+'</div>');
    var three=is3?'<div class="st-stage"><div class="st-big"><img src="'+LK[st.look].src+'" alt=""></div><div class="st-actions"><button class="st-btn st-brand" data-rnd3="1">Surprise me</button><button class="st-btn" data-mode="av">Fine tune</button></div></div>'+
      '<div class="st-panel"><div class="st-group"><h4>Pick a 3D look</h4><div class="st-looks">'+LK.map(function(l,n){return '<button class="st-look'+(n===st.look?' on':'')+'" data-look="'+n+'" aria-pressed="'+(n===st.look)+'" aria-label="Look '+(n+1)+'"><img src="'+l.src+'" alt="" loading="lazy"></button>'}).join('')+'</div></div><p class="st-note">Every look is a starting point. Change hair, skin, glasses or clothes in Fine tune.</p></div>':'';
    root.innerHTML=modes+(is3?three:body)+
      (st.sheet?'<div class="st-scrim" data-close="1">'+sheet()+'</div>':'');
    var t2=root.querySelector(".st-tabs");if(t2)t2.scrollLeft=sl;var p2=root.querySelector(".st-panel");if(p2)p2.scrollTop=ps;
    if(opts.onChange)opts.onChange(st.A);
  }
  root.addEventListener("click",function(e){var b=e.target.closest("button,[data-close]");if(!b||!root.contains(b))return;var d=b.dataset;
    if(d.close&&(e.target===b||b.tagName==="BUTTON")){st.sheet=false;draw();return}
    if(d.mode){st.m=d.mode;st.photoMode=d.mode==="ph";draw();return}
    if(d.look){st.look=+d.look;if(opts.onLook)opts.onLook(opts.looks[st.look]);draw();return}
    if(d.rnd3){var nn=st.look;while(opts.looks.length>1&&nn===st.look)nn=Math.floor(Math.random()*opts.looks.length);st.look=nn;if(opts.onLook)opts.onLook(opts.looks[st.look]);draw();return}
    if(d.tab){st.tab=d.tab;draw();return}
    if(d.t){st.A[d.t]=!st.A[d.t];draw();return}
    if(d.blur){st.blur=!st.blur;draw();return}
    if(d.surprise){st.sheet=true;st.res=null;draw();return}
    if(d.shuffle){st.A=generate({age:"any",pres:"any",len:"any",style:pk(["Casual","Sporty","Smart","Street","Artsy"]),facial:"Any",glasses:"Any",skin:-1});draw();return}
    if(d.q){st.Q[d.q]=d.v;draw();return}
    if(d.gen){st.res=[0,1,2,3].map(function(){return generate(st.Q)});draw();return}
    if(d.pick){st.A=st.res[+d.pick];st.sheet=false;draw();return}
    if(d.k){st.A[d.k]=d.n?+d.v:d.v;if(d.k==="hat"&&d.v==="hijab")st.A.ears="none";draw()}
  });
  root.addEventListener("change",function(e){if(!e.target.dataset.file)return;var f=e.target.files&&e.target.files[0];if(!f)return;var r=new FileReader();r.onload=function(){st.photo=r.result;draw()};r.readAsDataURL(f)});
  draw();
  return {get:function(){return cl(st.A)},set:function(o){st.A=cl(o);draw()},state:st};
}

window.BRQAvatar={svg:avatarSVG,presets:PRESETS,studio:studio,generate:generate,get:function(n){return avatarSVG(PRESETS[n]||PRESETS.milo)}};
})();
