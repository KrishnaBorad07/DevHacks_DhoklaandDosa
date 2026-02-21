
import 'dotenv/config';
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_KEY;

if (!supabaseUrl || !supabaseKey) {
    console.error('❌ Missing env vars');
    process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function runTest() {
    console.log('--- Supabase Diagnostic ---');

    // Test 1: Check game_sessions
    console.log('1. Checking game_sessions table...');
    const { data: sessions, error: sessionErr } = await supabase
        .from('game_sessions')
        .select('*')
        .limit(1);

    if (sessionErr) {
        console.error('❌ Error reading game_sessions:', sessionErr.message);
    } else {
        console.log('✅ game_sessions accessible. Count found:', sessions?.length);
    }

    // Test 2: Check player_scores
    console.log('2. Checking player_scores table...');
    const { data: scores, error: scoreErr } = await supabase
        .from('player_scores')
        .select('*')
        .limit(1);

    if (scoreErr) {
        console.error('❌ Error reading player_scores:', scoreErr.message);
    } else {
        console.log('✅ player_scores accessible. Count found:', scores?.length);
    }

    // Test 3: Try a dummy insert into player_scores
    const testName = 'test_user_' + Math.floor(Math.random() * 1000);
    console.log(`3. Attempting test insert for "${testName}"...`);
    const { error: insertErr } = await supabase
        .from('player_scores')
        .insert({
            player_name: testName,
            total_score: 10,
            games_won: 1,
            games_played: 1,
            last_room_code: 'TEST00'
        });

    if (insertErr) {
        console.error('❌ Test insert failed:', insertErr.message);
        if (insertErr.message.includes('column') || insertErr.message.includes('not found')) {
            console.log('💡 TIP: Check if your column names match EXACTLY (player_name, total_score, etc.)');
        }
    } else {
        console.log('✅ Test insert SUCCESS!');
        // Cleanup
        await supabase.from('player_scores').delete().eq('player_name', testName);
    }

    console.log('--- Diagnostic Complete ---');
}

runTest();
