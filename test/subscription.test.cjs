const test=require('node:test');
const assert=require('node:assert/strict');
const stripe=require('../backend/lib/stripe');
const subscriptions=require('../backend/lib/subscription');
const billing=require('../backend/lib/subscription-billing');
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
test('billing matcher supports the subscriber, parent and fiscal identity layers',()=>{
  const portal={email:'student@example.test',nombre:'Student',apellidos:'Robin',dni_numero:'11111111H',contract_data:{cliente:{nombre:'Parent Robin',dni:'22222222J',email:'parent@example.test'}}};
  assert.equal(billing.scoreCandidate({email:'student@example.test'},portal).score,100);
  assert.equal(billing.scoreCandidate({email:'parent@example.test'},portal).score,100);
  assert.equal(billing.scoreCandidate({profile_extra:{billing_tax_id:'22222222J'}},portal).score,100);
  assert.equal(billing.scoreCandidate({nombre:'Parent',apellidos:'Robin'},portal).score,45);
});
test('zero amount Stripe invoices are never sent to Holded',async()=>{
  const result=await billing.processStripeInvoice({from(){throw new Error('database must not be accessed');}},{id:'in_free',amount_paid:0});
  assert.deepEqual(result,{ok:false,skipped:true,reason:'zero_amount_invoice'});
});
