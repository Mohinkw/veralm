export const LICENSING_AGREEMENT_VERSION = 'v1.0';
export const LICENSING_AGREEMENT_TEXT = `VeraLM Creator Licensing Agreement ${LICENSING_AGREEMENT_VERSION}
The creator grants VeraLM a license to index, retrieve, summarize and cite submitted articles within VeraLM AI search answers, in exchange for revenue share attributed to query contributions. The creator affirms they own or control the rights to submitted content. The creator may withdraw an approved article with 30 days notice.`;

export async function agreementHash() {
  const digest = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(LICENSING_AGREEMENT_TEXT));
  return Array.from(new Uint8Array(digest)).map(b => b.toString(16).padStart(2, '0')).join('');
}
