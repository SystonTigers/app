import bcrypt from "bcryptjs";
const run = async () => {
  const h = await bcrypt.hash("SystonAdmin2024!", 10);
  console.log(h);
};
run();
