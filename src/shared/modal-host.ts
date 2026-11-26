let modalCount = 0;

export function acquireModalBodyClass(): () => void {
    if (typeof document === "undefined" || !document.body) return () => {};
    modalCount += 1;
    document.body.classList.add("lvct-has-modal");
    let released = false;
    return () => {
        if (released) return;
        released = true;
        modalCount = Math.max(0, modalCount - 1);
        if (modalCount === 0) {
            document.body.classList.remove("lvct-has-modal");
        }
    };
}

export function attachDialogRootClass(node: HTMLElement, className: string) {
    const root = node.closest<HTMLElement>(".lvct-dialog-root");
    root?.classList.add(className);
    return {
        destroy() {
            root?.classList.remove(className);
        },
    };
}
