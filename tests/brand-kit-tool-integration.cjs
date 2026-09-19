const fs=require('fs'),assert=require('assert');
const helper=fs.readFileSync('js/brand-kit-apply.js','utf8');
const thumbHtml=fs.readFileSync('thumbnail-maker.html','utf8');
const thumbJs=fs.readFileSync('js/tools/thumbnail-maker.js','utf8');
const releaseHtml=fs.readFileSync('release-pack.html','utf8');
const releaseJs=fs.readFileSync('js/tools/release-pack.js','utf8');
const releasePro=fs.readFileSync('js/tools/release-pack-pro.js','utf8');
const analytics=fs.readFileSync('js/analytics.js','utf8');

assert.doesNotThrow(()=>new Function(helper),'Brand Kit apply helper must remain valid JavaScript');
assert.doesNotThrow(()=>new Function(thumbJs),'Thumbnail Maker must remain valid JavaScript');
assert.doesNotThrow(()=>new Function(releaseJs),'Release Pack must remain valid JavaScript');
assert(helper.includes("access?.isPro"),'Brand Kit application must require Pro');
assert(helper.includes("from('brand_kits')"),'Brand Kit application must read the synced Brand Kits table');
assert(helper.includes("eq('is_active',true)"),'Brand Kit application must only use the active kit');
assert(helper.includes("droopBrandPrefix")&&helper.includes("droopBrandPrimary")&&helper.includes("droopBrandSecondary"),'Brand Kit helper must publish sanitized active settings');
assert(helper.includes("track?.('pro_brand_kit_apply')"),'Brand Kit application must emit the privacy-safe activation event');

assert(thumbHtml.includes('js/pro-access.js?v=1'),'Thumbnail Maker must load Pro entitlement before Brand Kit application');
assert(thumbHtml.includes('js/brand-kit-apply.js?v=1'),'Thumbnail Maker must load Brand Kit application');
assert(thumbJs.includes('brandPrefix'),'Thumbnail Maker must use the Brand Kit filename prefix');
assert(thumbJs.includes('brandSecondary'),'Thumbnail Maker must support the Brand Kit secondary color');
assert(thumbJs.includes("'rgba(9,17,29,0)'"),'Thumbnail Maker must preserve the original Free overlay when no Brand Kit is active');
assert(thumbJs.includes("'rgba(0,0,0,.8)'"),'Thumbnail Maker must preserve the original Free text stroke when no Brand Kit is active');

assert(releaseHtml.includes('js/brand-kit-apply.js?v=1'),'Release Pack must load Brand Kit application');
assert(releaseHtml.indexOf('js/creator-profile-apply.js?v=1')<releaseHtml.indexOf('js/brand-kit-apply.js?v=1'),'Brand Kit must apply after Creator Profile so branding wins');
assert(releaseJs.includes('branded(o.file)'),'Release Pack outputs must use the Brand Kit filename prefix');
assert(releaseJs.includes("branded(`droop-${select.value}-pack.zip`)"),'Release Pack ZIP must use the Brand Kit filename prefix');
assert(releasePro.includes("customPackPrefix"),'Custom Release Pack prefix must remain available for Brand Kit application');
assert(analytics.includes("'pro_brand_kit_apply'"),'Brand Kit apply event must remain analytics-allowlisted');

console.log('brand kit tool integration checks: ok');