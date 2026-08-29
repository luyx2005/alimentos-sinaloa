import "dotenv/config";
import { SignJWT } from "jose";

async function main() {
  const secret = new TextEncoder().encode(process.env.AUTH_SECRET!);
  const token = await new SignJWT({
    id: 1,
    name: "Capturista Demo",
    username: "demo",
  })
    .setProtectedHeader({ alg: "HS256" })
    .setIssuedAt()
    .setExpirationTime("12h")
    .sign(secret);
  console.log(token);
}

main();
