export const subscriptionEvents=new Set([
  'subscription_created',
  'subscription_updated',
  'subscription_cancelled',
  'subscription_resumed',
  'subscription_expired',
  'subscription_paused',
  'subscription_unpaused',
  'subscription_plan_changed'
]);

export const subscriptionStatuses=new Set([
  'on_trial','active','paused','past_due','unpaid','cancelled','expired'
]);

export function isUuid(value){
  return typeof value==='string'&&/^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(value);
}

export function strictInt(value,name){
  const text=String(value??'');
  if(!/^\d+$/.test(text))throw new Error(`Invalid ${name}`);
  return Number(text);
}

export function strictBool(value,name){
  if(value===true||value==='true')return true;
  if(value===false||value==='false')return false;
  throw new Error(`Invalid ${name}`);
}

export function parseSubscriptionPayload(payload){
  const event=String(payload?.meta?.event_name||'');
  if(!subscriptionEvents.has(event))throw new Error('Unsupported subscription event');
  if(payload?.data?.type!=='subscriptions')throw new Error('Expected a subscription payload');

  const attrs=payload?.data?.attributes||{};
  const status=String(attrs.status||'');
  if(!subscriptionStatuses.has(status))throw new Error('Unexpected subscription status');

  const updatedAt=String(attrs.updated_at||'');
  if(!updatedAt||Number.isNaN(Date.parse(updatedAt)))throw new Error('Missing subscription updated_at');

  const subscriptionId=String(payload?.data?.id||'');
  if(!subscriptionId)throw new Error('Missing subscription id');

  const rawUserId=payload?.meta?.custom_data?.user_id;
  const userId=rawUserId==null||rawUserId===''?null:String(rawUserId);
  if(userId!==null&&!isUuid(userId))throw new Error('Invalid custom user_id');

  return {
    event,
    subscriptionId,
    userId,
    storeId:strictInt(attrs.store_id,'store_id'),
    variantId:strictInt(attrs.variant_id,'variant_id'),
    status,
    testMode:strictBool(attrs.test_mode,'test_mode'),
    renewsAt:attrs.renews_at||null,
    endsAt:attrs.ends_at||null,
    updatedAt
  };
}
