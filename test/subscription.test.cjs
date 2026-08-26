const test=require('node:test');
const assert=require('node:assert/strict');
const stripe=require('../backend/lib/stripe');
const subscriptions=require('../backend/lib/subscription');
test('checkout refuses portal payments and unpaid subscription sessions',async()=>{
  const db={from(){throw new Error('must not access database');}};
  assert.equal((await stripe.fulfillCheckout(db,{metadata:{kind:'onboarding'}})).reason,'unsupported_checkout');
  assert.equal((await stripe.fulfillCheckout(db,{mode:'subscription',metadata:{kind:'subscription'},payment_status:'unpaid'})).reason,'not_paid');
});
test('subscription fulfillment is idempotent for the same Stripe subscription',async()=>{
  const db={from:()=>({select:()=>({eq:()=>({single:async()=>({data:{id:'u1',stripe_subscription_id:'sub_1'}})})})})};
  const result=await stripe.fulfillCheckout(db,{mode:'subscription',payment_status:'paid',metadata:{kind:'subscription',user_id:'u1'},subscription:'sub_1'});
  assert.deepEqual(result,{ok:true,already:true});
});
test('database failures propagate to enable webhook retry',async()=>{
  const failure=new Error('database unavailable');
  const db={from:()=>({select:()=>({eq:()=>({single:async()=>({error:failure}),limit:async()=>({error:failure})})})})};
  await assert.rejects(subscriptions.fulfillSubscriptionCheckout(db,{metadata:{user_id:'u1'}}),failure);
  await assert.rejects(subscriptions.syncSubscriptionFromStripeObject(db,{id:'sub_1'}),failure);
});
test('plan prices and statuses retain subscription behavior',()=>{
  assert.equal(subscriptions.planAmount('monthly'),49.99);
  assert.equal(subscriptions.planAmount('annual'),299.99);
  assert.equal(subscriptions.planAmount('invalid'),null);
  assert.equal(subscriptions.mapStripeStatus('unpaid'),'past_due');
  assert.equal(subscriptions.mapStripeStatus('incomplete_expired'),'canceled');
  assert.equal(stripe.toCents(49.99),4999);
});
