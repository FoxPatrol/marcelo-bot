import dotenv from "dotenv"

dotenv.config()

const { TOKEN } = process.env;

if(!TOKEN)
{
    throw new Error("Missing TOKEN variable");
}

const config: Record<string, string> = {
    TOKEN
}
export default config