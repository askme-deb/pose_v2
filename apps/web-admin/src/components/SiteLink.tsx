import { Link, type LinkProps } from 'react-router-dom';
import { siteHref } from '../utils/siteUrls';

// Drop-in for <Link> on pages shared by the landing site and the portal:
// stays a client-side <Link> on the right host, becomes a full <a href> when
// the target lives on the other host (see utils/siteUrls.ts).
export default function SiteLink({ to, ...props }: LinkProps & { to: string }) {
  const { external, href } = siteHref(to);
  if (external) {
    const { replace: _replace, state: _state, relative: _relative, preventScrollReset: _psr, reloadDocument: _rd, viewTransition: _vt, ...anchorProps } = props;
    return <a href={href} {...anchorProps} />;
  }
  return <Link to={href} {...props} />;
}
