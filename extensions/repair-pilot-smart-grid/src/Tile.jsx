// Make sure this side-effect import is present so <s-*> elements are registered
import '@shopify/ui-extensions/preact';
import { render } from 'preact';

function Tile() {
  const openModal = () => {
    try {
      // This calls your pos.home.modal.render target (if configured)
      shopify?.action?.presentModal?.();
    } catch (e) {
      // Safe fallback so dev doesn’t crash silently
      console.warn('presentModal failed:', e);
    }
  };

  return (
    <s-tile
      heading="New Repair"
      subheading="Create ticket"
      onClick={openModal}
    />
  );
}

export default () => {
  render(<Tile />, document.body);
};
