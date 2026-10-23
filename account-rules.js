// Shared account validation. Public identity never contains login credentials.
(function(root,factory){const api=factory();if(typeof module==='object'&&module.exports)module.exports=api;else root.AccountRules=api;})(globalThis,()=>{
  const avatars=Object.freeze(['survivor','medic','ranger','hazmat','sentinel']);
  const segments=typeof Intl.Segmenter==='function'?new Intl.Segmenter(undefined,{granularity:'grapheme'}):null;
  const characters=value=>segments?Array.from(segments.segment(value),s=>s.segment):Array.from(value);
  function displayName(value){return typeof value==='string'?value.normalize('NFC').trim():'';}
  function validName(value){const name=displayName(value);return !!name&&name.length<=512&&characters(name).length<=20&&!/[\p{Cc}\p{Cs}\u202a-\u202e\u2066-\u2069\u200b\ufeff]/u.test(name);}
  function guestName(value){return characters(displayName(value).replace(/[\p{Cc}\p{Cs}\u202a-\u202e\u2066-\u2069\u200b\ufeff]/gu,'')).slice(0,20).join('')||'Player';}
  const validUsername=value=>typeof value==='string'&&/^[A-Za-z0-9]{10,25}$/.test(value);
  const validPassword=value=>typeof value==='string'&&/^[A-Za-z0-9]{8,64}$/.test(value)&&/[A-Z]/.test(value);
  const validAvatar=value=>avatars.includes(value);
  function validate(fields,registration=true){
    if(registration&&!validUsername(fields.username))return 'username_rule';
    if(registration&&!validPassword(fields.password))return 'password_rule';
    if(!validName(fields.displayName))return 'display_name_rule';
    if(!validAvatar(fields.avatarId))return 'avatar_rule';
    return '';
  }
  return {avatars,characters,displayName,guestName,validName,validUsername,validPassword,validAvatar,validate};
});
