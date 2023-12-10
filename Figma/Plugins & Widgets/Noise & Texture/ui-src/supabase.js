import { createClient } from '@supabase/supabase-js';
import clientStorage from './FigmaClientStorage';

const supabase = createClient(
    'https://hljhporplmvopufuqifu.supabase.co',
    'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imhsamhwb3JwbG12b3B1ZnVxaWZ1Iiwicm9sZSI6ImFub24iLCJpYXQiOjE2NzAxMDYyNTcsImV4cCI6MTk4NTY4MjI1N30.afCt1d8C4A3JGp0J9MxaEn1i0DihmJOozE3b_chzNMI'
    /*{
        auth: {
            storage: clientStorage
        }
    }*/
)

async function getFeaturedTextures() {
    return await supabase
        .from('textures')
        .select('*')
        .eq('featured', true)
        .order('updated_at', { ascending: false })
}

export { supabase, getFeaturedTextures };