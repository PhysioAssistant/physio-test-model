import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = process.env.VITE_SUPABASE_URL || 'https://pzwiapmcflxwpndwonwa.supabase.co';
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;
const VITE_SUPABASE_ANON_KEY = process.env.VITE_SUPABASE_ANON_KEY;

const adminSupa = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

async function test() {
  console.log('\n=== STEP 1: Create temp admin user ===');
  const email = `testadmin_${Date.now()}@example.com`;
  const { data: user, error: createErr } = await adminSupa.auth.admin.createUser({
    email, password: 'TestPass123!', email_confirm: true
  });
  if (createErr) { console.error('Create user error:', createErr); return; }
  const userId = user.user.id;
  console.log('Created user:', userId);

  // Set as admin in profiles
  await adminSupa.from('profiles').update({ role: 'admin' }).eq('id', userId);

  console.log('\n=== STEP 2: Sign in as admin ===');
  const normalSupa = createClient(SUPABASE_URL, VITE_SUPABASE_ANON_KEY);
  const { error: signInErr } = await normalSupa.auth.signInWithPassword({ email, password: 'TestPass123!' });
  if (signInErr) { console.error('Sign in error:', signInErr); return; }
  console.log('Signed in successfully');

  console.log('\n=== STEP 3: Test admin_list_all_profiles (should return all users with login_count) ===');
  const { data: profiles, error: listErr } = await normalSupa.rpc('admin_list_all_profiles');
  if (listErr) {
    console.error('❌ admin_list_all_profiles FAILED:', listErr.message);
  } else {
    console.log(`✅ admin_list_all_profiles SUCCESS — ${profiles.length} users returned`);
    console.log('   Sample:', JSON.stringify(profiles[0], null, 2));
    const hasLoginCount = profiles.every(p => 'login_count' in p);
    console.log(`   login_count field present: ${hasLoginCount ? '✅ YES' : '❌ NO'}`);
  }

  console.log('\n=== STEP 4: Test admin_get_user_details for first real user ===');
  const realUserId = profiles?.[0]?.id;
  if (realUserId) {
    const { data: details, error: detailErr } = await normalSupa.rpc('admin_get_user_details', { target_user_id: realUserId });
    if (detailErr) {
      console.error('❌ admin_get_user_details FAILED:', detailErr.message);
    } else {
      console.log('✅ admin_get_user_details SUCCESS');
      console.log('   patient_count:', details.patient_count);
      console.log('   case_count:', details.case_count);
      console.log('   ground_truth_count:', details.ground_truth_count);
      console.log('   total_logins:', details.total_logins);
      console.log('   login_history entries:', details.login_history?.length);
      console.log('   recent_cases entries:', details.recent_cases?.length);
    }
  }

  console.log('\n=== STEP 5: Test login logging (insert to user_activity_logs) ===');
  const { error: logErr } = await normalSupa.from('user_activity_logs').insert({
    user_id: userId,
    event_type: 'login',
    user_agent: 'Test/1.0',
  });
  if (logErr) {
    console.error('❌ Login logging FAILED:', logErr.message);
  } else {
    console.log('✅ Login logging SUCCESS');
  }

  console.log('\n=== STEP 6: Test is_active deactivation ===');
  const { error: deactErr } = await adminSupa.from('profiles').update({ is_active: false }).eq('id', userId);
  if (deactErr) {
    console.error('❌ Deactivation FAILED:', deactErr.message);
  } else {
    // Try to fetch profile — should show is_active: false
    const { data: profile } = await adminSupa.from('profiles').select('is_active').eq('id', userId).single();
    console.log(`✅ Deactivation SUCCESS — is_active: ${profile?.is_active}`);
    // Re-activate for cleanup
    await adminSupa.from('profiles').update({ is_active: true }).eq('id', userId);
  }

  console.log('\n=== CLEANUP: Remove test user ===');
  await normalSupa.auth.signOut();
  await adminSupa.auth.admin.deleteUser(userId);
  console.log('Cleanup done.');

  console.log('\n✅ ALL TESTS COMPLETE');
}

test().catch(console.error);
