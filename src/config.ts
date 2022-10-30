import dotenv from "dotenv"

dotenv.config()

const { CLIENT_ID, GUILD_ID, TOKEN} = process.env;

if(!TOKEN || !CLIENT_ID || !GUILD_ID)
{
    throw new Error("Missing TOKEN variable");
}

const config: Record<string, string> = {
    CLIENT_ID,
    GUILD_ID,
    TOKEN
}
export default config