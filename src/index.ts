function isClassExtending(targetClass: any, baseClass: any) {
    if (!targetClass || !baseClass) return false;

    const baseName = typeof baseClass === 'string' ? baseClass : baseClass.name;

    let current = targetClass;
    while (current !== null && current !== undefined) {
        if (current === baseClass) return true;
        if (current.name === baseName) return true;

        current = Object.getPrototypeOf(current);
    }
    return false;
}

export function handleTcHmiHmr(newModule: any) {

    if (!newModule) return;

    for (const [_, newModuleElement] of Object.entries(newModule)) {
        if (!(isClassExtending(newModuleElement, "TcHmiControl"))) continue;
        const newControl = newModuleElement as any;

        const instances = Array.from((window as any).TcHmi.Controls.getMap())
            .filter(([_, inst]: any) => isClassExtending(inst, newControl)) as any[];

        console.groupCollapsed(`🔥 HMR: Updated '${newControl.name}' with ${instances.length} instances.`);

        for (const [id, instance] of instances) {
            instance.__detach();
            Object.setPrototypeOf(instance, newControl.prototype);
            instance.__attach();

            const logHelper = {
                type: instance.getType(),
                dom: instance.getElement()[0],
                instance: instance,
                [Symbol.toStringTag]: `✅ Patched & Reattached: '${id}'`
            }
            console.dir(logHelper);
        }

        console.groupEnd();
    }
    
}