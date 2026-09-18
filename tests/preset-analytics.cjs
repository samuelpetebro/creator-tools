const fs=require('fs'),assert=require('assert');

const cloud=fs.readFileSync('js/cloud.js','utf8');
const analytics=fs.readFileSync('js/analytics.js','utf8');
const toolI18n=fs.readFileSync('js/tool-i18n.js','utf8');

for(const event of ['preset_save','preset_load','preset_delete']){
  assert(analytics.includes(`'${event}'`),`${event} must stay allowlisted`);
  assert(cloud.includes(`DroopAnalytics?.track?.('${event}')`),`preset client must emit ${event}`);
}
assert(toolI18n.includes("js/cloud.js?v=3"),'tool loader must fetch the expanded preset client');
console.log('preset analytics checks: ok');
