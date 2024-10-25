import { createClient } from "@supabase/supabase-js";

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

export const supabase = createClient(supabaseUrl, supabaseKey);

export const validateConnection = async () => {
  try {
    const { error } = await supabase.auth.getSession();
    if (error) {
      console.error("Error validating connection:", error);
      return false;
    }
    console.log("Connection validated successfully!");
    return true;
  } catch (error) {
    console.error("Error validating connection:", error);
    return false;
  }
};

export default supabase;
