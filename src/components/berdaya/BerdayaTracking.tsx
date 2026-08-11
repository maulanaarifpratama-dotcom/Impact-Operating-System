import React from 'react';
import { Helmet } from 'react-helmet-async';

// Ad-performance tracking for the /berdaya acquisition funnel only.
// Scoped to this page (not injected into the global <head>) so it doesn't
// affect any other route on the site.
const META_PIXEL_ID = '2078606565502948';
const GA_MEASUREMENT_ID = 'G-8VCJ58GJB5';

export const BerdayaTracking: React.FC = () => {
  return (
    <Helmet>
      {/* Google tag (gtag.js) */}
      <script async src={`https://www.googletagmanager.com/gtag/js?id=${GA_MEASUREMENT_ID}`} />
      <script>{`
        window.dataLayer = window.dataLayer || [];
        function gtag(){dataLayer.push(arguments);}
        gtag('js', new Date());
        gtag('config', '${GA_MEASUREMENT_ID}');
      `}</script>

      {/* Meta Pixel Code */}
      <script>{`
        !function(f,b,e,v,n,t,s)
        {if(f.fbq)return;n=f.fbq=function(){n.callMethod?
        n.callMethod.apply(n,arguments):n.queue.push(arguments)};
        if(!f._fbq)f._fbq=n;n.push=n;n.loaded=!0;n.version='2.0';
        n.queue=[];t=b.createElement(e);t.async=!0;
        t.src=v;s=b.getElementsByTagName(e)[0];
        s.parentNode.insertBefore(t,s)}(window, document,'script',
        'https://connect.facebook.net/en_US/fbevents.js');
        fbq('init', '${META_PIXEL_ID}');
        fbq('track', 'PageView');
      `}</script>
      <noscript>{`<img height="1" width="1" style="display:none" src="https://www.facebook.com/tr?id=${META_PIXEL_ID}&ev=PageView&noscript=1" />`}</noscript>
    </Helmet>
  );
};

export default BerdayaTracking;
