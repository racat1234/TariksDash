'use client';
import { useEffect } from 'react';
export function DashboardMaintenance(){useEffect(()=>{const apply=()=>{const hour=new Date().getHours();document.documentElement.classList.toggle('dashboard-night-warm',hour>=23||hour<6.5)};apply();const night=window.setInterval(apply,60_000);const reload=window.setTimeout(()=>window.location.reload(),12*60*60_000);return()=>{clearInterval(night);clearTimeout(reload)}},[]);return null}
