export const md5 = async (input: string) => {
  const enc = new TextEncoder().encode(input);
  const buf = await crypto.subtle.digest('MD5', enc);
  return [...new Uint8Array(buf)].map(b => b.toString(16).padStart(2,'0')).join('');
};
