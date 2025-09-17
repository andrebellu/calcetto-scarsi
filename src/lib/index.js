// place files you want to import through the `$lib` alias in this folder.
export const sensors = {
    // Example sensor for DnD Kit
    pointer: (node) => {
        const handlePointerDown = (event) => {
            node.dispatchEvent(new CustomEvent('pointerdown', { detail: event }));
        };

        node.addEventListener('pointerdown', handlePointerDown);
        return {
            destroy() {
                node.removeEventListener('pointerdown', handlePointerDown);
            }
        };
    }
};

