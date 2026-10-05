#!/usr/bin/env node
'use strict';
const fs=require('fs');
const os=require('os');
const path=require('path');
const {pathToFileURL}=require('url');
const root=path.resolve(__dirname,'..');
const assets=path.join(root,'assets');
const rough=require(path.join(assets,'vendor','rough.cjs.js'));
const usage='node render.cjs SCENE.json --output IMAGE.png [--modules-dir PATH] [--browser-executable PATH] [--scale 2] [--overwrite]';

async function main(){
  const args=process.argv.slice(2);
  if(args.includes('--help')||!args.length){console.log(usage);return;}
  const scenePath=path.resolve(args.shift()),options={scale:2};
  const flags=new Set(['--output','--modules-dir','--browser-executable','--scale']);
  while(args.length){
    const flag=args.shift();
    if(flag==='--overwrite'){options.overwrite=true;continue;}
    if(!flags.has(flag)||!args.length)throw Error('Unknown or incomplete option: '+flag+'\n'+usage);
    options[flag.slice(2)]=args.shift();
  }
  if(!options.output)throw Error('--output is required');
  const output=path.resolve(options.output);
  if(path.extname(output).toLowerCase()!=='.png')throw Error('Output must be .png');
  if(fs.existsSync(output)&&!options.overwrite)throw Error('Output exists; choose a new name or use --overwrite: '+output);
  const scale=Number(options.scale);
  if(!Number.isFinite(scale)||scale<1||scale>4)throw Error('--scale must be between 1 and 4');
  const scene=JSON.parse(fs.readFileSync(scenePath,'utf8'));
  const finite=(v,label)=>{if(typeof v!=='number'||!Number.isFinite(v))throw Error('Expected finite number: '+label);return v;};
  const positive=(v,label)=>{finite(v,label);if(v<=0)throw Error('Expected positive number: '+label);return v;};
  const W=positive(scene.width,'width'),H=positive(scene.height,'height');
  if(!Number.isInteger(W)||!Number.isInteger(H)||W>10000||H>10000)throw Error('Canvas dimensions must be integers at most 10000');
  if(W*H*scale*scale>50000000)throw Error('Output exceeds 50 megapixels; reduce canvas or scale');
  if(!Array.isArray(scene.elements)||!scene.elements.length)throw Error('elements must be a nonempty array');
  const color=(v,fallback)=>{v=v??fallback;if(typeof v!=='string'||!(/^(#[0-9a-f]{3,8}|none|transparent)$/i.test(v)))throw Error('Use a hex color or none: '+v);return v;};
  const escape=s=>String(s).replaceAll('&','&amp;').replaceAll('<','&lt;').replaceAll('>','&gt;').replaceAll('"','&quot;');
  const coverage=new Set(JSON.parse(fs.readFileSync(path.join(assets,'font-coverage.json'),'utf8')));
  let seed=scene.seed??77123;finite(seed,'seed');
  const generator=rough.generator(),parts=[];
  const emit=drawable=>{for(const p of generator.toPaths(drawable))parts.push(`<path d="${p.d}" stroke="${p.stroke}" stroke-width="${p.strokeWidth}" fill="${p.fill||'none'}" stroke-linecap="round" stroke-linejoin="round"/>`);};
  const rounded=(x,y,w,h,r)=>`M${x+r} ${y} H${x+w-r} Q${x+w} ${y} ${x+w} ${y+r} V${y+h-r} Q${x+w} ${y+h} ${x+w-r} ${y+h} H${x+r} Q${x} ${y+h} ${x} ${y+h-r} V${y+r} Q${x} ${y} ${x+r} ${y} Z`;
  for(let i=0;i<scene.elements.length;i++){
    const e=scene.elements[i],id=e.id??`element-${i}`;
    const opt={fill:color(e.fill,'none'),fillStyle:'solid',stroke:color(e.stroke,'#252525'),strokeWidth:positive(e.strokeWidth??2,id+'.strokeWidth'),roughness:finite(e.roughness??.8,id+'.roughness'),seed:Math.trunc(seed++),bowing:.8};
    if(e.type==='text'){
      finite(e.x,id+'.x');finite(e.y,id+'.y');
      if(typeof e.text!=='string')throw Error(id+': text must be a string');
      const missing=[...new Set([...e.text].filter(c=>!/[\n\r\t ]/.test(c)&&!coverage.has(c.codePointAt(0))))];
      if(missing.length)throw Error(id+': bundled font has no glyph for '+missing.join(' '));
      const size=positive(e.size??28,id+'.size'),lh=positive(e.lineHeight??size*1.35,id+'.lineHeight');
      const anchor={left:'start',center:'middle',right:'end'}[e.align??'left'];
      if(!anchor)throw Error(id+': align must be left, center or right');
      const max=e.maxWidth===undefined?'':` data-max-width="${positive(e.maxWidth,id+'.maxWidth')}"`;
      const lines=e.text.replaceAll('\r','').split('\n');
      const spans=lines.map((v,j)=>`<tspan x="${e.x}" y="${e.y+j*lh}">${escape(v)}</tspan>`).join('');
      parts.push(`<text data-label="${escape(id)}"${max} text-anchor="${anchor}" dominant-baseline="middle" font-family="HandLatin, HandZh" font-size="${size}" fill="${color(e.color,'#252525')}">${spans}</text>`);
    } else if(e.type==='rect'||e.type==='ellipse'){
      const x=finite(e.x,id+'.x'),y=finite(e.y,id+'.y'),w=positive(e.width,id+'.width'),h=positive(e.height,id+'.height');
      if(e.type==='rect'){
        const r=Math.max(0,Math.min(finite(e.radius??24,id+'.radius'),w/2,h/2));
        emit(generator.path(rounded(x,y,w,h,r),opt));
      }else emit(generator.ellipse(x+w/2,y+h/2,w,h,opt));
    } else if(e.type==='line'||e.type==='arrow'){
      if(!Array.isArray(e.points)||e.points.length<2)throw Error(id+': at least two points required');
      for(const p of e.points){if(!Array.isArray(p)||p.length!==2)throw Error(id+': invalid point');p.forEach(v=>finite(v,id+'.points'));}
      if(e.dashed)parts.push('<g stroke-dasharray="10 9">');
      emit(generator.linearPath(e.points,{...opt,fill:'none',disableMultiStroke:!!e.dashed}));
      if(e.dashed)parts.push('</g>');
      if(e.type==='arrow'){
        const [x,y]=e.points.at(-1),prev=[...e.points].reverse().find(p=>p[0]!==x||p[1]!==y);
        if(!prev)throw Error(id+': arrow must have length');
        const a=Math.atan2(y-prev[1],x-prev[0]),h=positive(e.headSize??13,id+'.headSize');
        emit(generator.linearPath([[x-h*Math.cos(a-.46),y-h*Math.sin(a-.46)],[x,y],[x-h*Math.cos(a+.46),y-h*Math.sin(a+.46)]],{...opt,fill:'none',seed:seed++}));
      }
    } else if(e.type==='path'){
      if(typeof e.d!=='string'||!e.d.trim())throw Error(id+': SVG path d required');
      emit(generator.path(e.d,opt));
    } else throw Error(id+': unknown element type '+e.type);
  }
  const css=fs.readFileSync(path.join(assets,'fonts.css'),'utf8').replace(/url\("([^"]+)"\)/g,(_,p)=>`url("${pathToFileURL(path.join(assets,p)).href}")`);
  const html=`<!doctype html><meta charset="utf-8"><style>${css}html,body{margin:0;width:${W}px;height:${H}px;overflow:hidden;background:${color(scene.background,'#ffffff')}}svg{display:block}</style><svg xmlns="http://www.w3.org/2000/svg" width="${W}" height="${H}" viewBox="0 0 ${W} ${H}">${parts.join('\n')}</svg>`;
  let playwright;
  try{playwright=options['modules-dir']?require(path.join(path.resolve(options['modules-dir']),'playwright')):require('playwright');}
  catch{throw Error('Playwright not found. Pass --modules-dir with the existing runtime node_modules directory.');}
  const explicit=options['browser-executable']||process.env.HANDDRAWN_BROWSER;
  const candidates=explicit?[explicit]:[playwright.chromium.executablePath(),'/Applications/Google Chrome.app/Contents/MacOS/Google Chrome','/Applications/Microsoft Edge.app/Contents/MacOS/Microsoft Edge','/usr/bin/chromium','/usr/bin/chromium-browser','/usr/bin/google-chrome'];
  const executablePath=candidates.find(p=>fs.existsSync(p));
  if(!executablePath)throw Error('Chromium not found. Pass --browser-executable.');
  const temp=fs.mkdtempSync(path.join(os.tmpdir(),'handdrawn-diagram-'));
  let browser;
  try{
    const pagePath=path.join(temp,'scene.html');fs.writeFileSync(pagePath,html);
    browser=await playwright.chromium.launch({executablePath,headless:true});
    const page=await browser.newPage({viewport:{width:W,height:H},deviceScaleFactor:scale});
    await page.route(/^https?:\/\//,r=>r.abort());
    await page.goto(pathToFileURL(pagePath).href);
    await page.evaluate(async()=>{await document.fonts.ready;});
    const check=await page.evaluate(({W,H})=>{
      const errors=[];
      for(const f of document.fonts)if(f.status==='error')errors.push('font load failed: '+f.family);
      for(const e of document.querySelectorAll('text')){
        const b=e.getBBox(),label=e.dataset.label;
        if(b.x<-.5||b.y<-.5||b.x+b.width>W+.5||b.y+b.height>H+.5)errors.push(label+': text outside canvas');
        if(e.dataset.maxWidth&&b.width>Number(e.dataset.maxWidth)+.5)errors.push(label+': text width '+b.width.toFixed(1)+' exceeds '+e.dataset.maxWidth);
      }
      return {errors,fontsLoaded:[...document.fonts].filter(f=>f.status==='loaded').length};
    },{W,H});
    if(check.errors.length)throw Error(check.errors.join('\n'));
    fs.mkdirSync(path.dirname(output),{recursive:true});
    await page.screenshot({path:path.join(temp,'render.png')});
    fs.copyFileSync(path.join(temp,'render.png'),output,options.overwrite?0:fs.constants.COPYFILE_EXCL);
    console.log(JSON.stringify({output,width:W*scale,height:H*scale,elements:scene.elements.length,fontsLoaded:check.fontsLoaded,textChecks:'passed'}));
  }finally{
    if(browser)await browser.close();
    fs.rmSync(temp,{recursive:true,force:true});
  }
}
main().catch(e=>{console.error(e.message);process.exitCode=1;});
