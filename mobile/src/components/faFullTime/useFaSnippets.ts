import { useEffect, useState } from 'react';
import { useClub } from '../../context/ClubContext';
import { getTenantId } from '../../services/club';
import { fetchFaSnippets, type FaSnippets } from './frame';

/** The club's FA Full-Time snippet codes ({} until loaded, or when there are none). */
export function useFaSnippets(): FaSnippets {
  const { club } = useClub();
  const key = club?.slug || getTenantId();
  const [snippets, setSnippets] = useState<FaSnippets>({});
  useEffect(() => {
    let live = true;
    fetchFaSnippets(key).then((s) => { if (live) setSnippets(s); });
    return () => { live = false; };
  }, [key]);
  return snippets;
}
