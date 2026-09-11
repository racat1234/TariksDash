'use client';

import { useEffect, useState } from 'react';
type Story={title:string;link:string};
export function BreakingNewsBanner(){const [stories,setStories]=useState<Story[]>([]);useEffect(()=>{const load=async()=>{try{const response=await fetch('/api/news');const items=(await response.json()).items||[];setStories(items.filter((item:Story)=>/\b(breaking|alert|urgent)\b/i.test(item.title)).slice(0,3));}catch{}};void load();const timer=window.setInterval(load,5*60_000);return()=>window.clearInterval(timer)},[]);if(!stories.length)return null;return <div className="breaking-banner"><strong>BREAKING</strong><div className="breaking-track">{[...stories,...stories].map((story,index)=><a key={`${story.link}-${index}`} href={story.link} target="_blank" rel="noreferrer">{story.title}<span>•</span></a>)}</div></div>}
