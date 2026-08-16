export interface CnameDomain {
  id: string;
  tenantOrg: string;
  cnameDomain: string;
  edgeIngressTarget: string;
  sslSlaStatus: string;
  dnsPropagationStatus: string;
}

export const cnameDomains: CnameDomain[] = [
  { id: 'dom-01', tenantOrg: 'Apex Supermarket Chain', cnameDomain: 'pos.apexsupermarket.com', edgeIngressTarget: 'ingress-mumbai-01.apexpos.com', sslSlaStatus: "Let's Encrypt TLS 1.3", dnsPropagationStatus: 'Propagated (6ms)' },
  { id: 'dom-02', tenantOrg: 'Metro Hypermarket Ltd', cnameDomain: 'billing.metrohyper.com', edgeIngressTarget: 'ingress-mumbai-01.apexpos.com', sslSlaStatus: 'Cloudflare TLS 1.3', dnsPropagationStatus: 'Propagated (8ms)' },
  { id: 'dom-03', tenantOrg: 'QuickBite Restaurant Group', cnameDomain: 'pos.quickbite.com', edgeIngressTarget: 'ingress-mumbai-01.apexpos.com', sslSlaStatus: "Let's Encrypt TLS 1.3", dnsPropagationStatus: 'Propagated (12ms)' },
  { id: 'dom-04', tenantOrg: 'Zenith Pharma Labs', cnameDomain: 'billing.zenithpharma.com', edgeIngressTarget: 'ingress-virginia-02.apexpos.com', sslSlaStatus: 'DigiCert TLS 1.3', dnsPropagationStatus: 'Propagated (4ms)' },
  { id: 'dom-05', tenantOrg: 'Luxe Fashion Retail', cnameDomain: 'checkout.luxefashion.com', edgeIngressTarget: 'ingress-frankfurt-03.apexpos.com', sslSlaStatus: "Let's Encrypt TLS 1.3", dnsPropagationStatus: 'Propagated (9ms)' },
  { id: 'dom-06', tenantOrg: 'Bharat Electronics Retail', cnameDomain: 'pos.bharatelectronics.com', edgeIngressTarget: 'ingress-virginia-02.apexpos.com', sslSlaStatus: 'Cloudflare TLS 1.3', dnsPropagationStatus: 'Propagated (11ms)' },
  { id: 'dom-07', tenantOrg: 'Highland Coffee Roasters', cnameDomain: 'billing.highlandcoffee.com', edgeIngressTarget: 'ingress-frankfurt-03.apexpos.com', sslSlaStatus: "Let's Encrypt TLS 1.3", dnsPropagationStatus: 'Propagated (7ms)' },
  { id: 'dom-08', tenantOrg: 'Sundar Departmental Stores', cnameDomain: 'pos.sundarstores.com', edgeIngressTarget: 'ingress-mumbai-01.apexpos.com', sslSlaStatus: "Let's Encrypt TLS 1.3", dnsPropagationStatus: 'Propagated (5ms)' },
];
