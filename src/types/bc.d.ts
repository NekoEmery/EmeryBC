// Minimal BC global type declarations

interface AssetGroup {
    Name: string;
    Category: string;
    IsRestraint: boolean;
}

interface Asset {
    Name: string;
    Group: AssetGroup;
    IsRestraint?: boolean;
}

interface CraftingItem {
    Name?: string;
    Description?: string;
    Color?: string;
    Property?: string;
    Lock?: string;
    Type?: string | null;
    ItemProperty?: Record<string, unknown>;
}

interface Item {
    Asset: Asset;
    Color?: string | string[];
    Difficulty?: number;
    Property?: Record<string, unknown>;
    Craft?: CraftingItem;
}

interface Character {
    MemberNumber: number;
    Name: string;
    Appearance: Item[];
    ExtensionSettings: Record<string, unknown>;
    OnlineSettings?: Record<string, unknown>;
    OnlineSharedSettings?: Record<string, unknown>;
    AssetFamily: string;
    OnlineID?: string | number;
    ActivePose?: string | string[] | null;
    FriendList?: number[];
    IsRestrained(): boolean;
}

interface ExtensionSetting {
    Identifier: string;
    ButtonText: string;
    Image: string;
    load?(): void;
    run(): void;
    click(): void;
    exit(): void;
}

declare const Player: Character;
declare const MouseX: number;
declare const MouseY: number;
declare const CurrentScreen: string;
declare const KeyPress: number;

declare function DrawButton(
    left: number, top: number,
    width: number, height: number,
    label: string, color: string,
    image?: string, hoverText?: string,
    disabled?: boolean
): void;

declare function DrawText(
    text: string, x: number, y: number,
    color: string, backColor?: string
): void;

declare function DrawTextFit(
    text: string, x: number, y: number,
    width: number, color: string, backColor?: string
): void;

declare function DrawRect(
    left: number, top: number,
    width: number, height: number,
    color: string
): void;

declare function DrawEmptyRect(
    left: number, top: number,
    width: number, height: number,
    color: string, thickness?: number
): void;

declare function ServerSend(type: string, data: unknown): void;
declare function ServerPlayerExtensionSettingsSync(addonName: string): void;
declare function ServerPlayerAppearanceSync(): void;
declare function ServerAppearanceBundle(appearance: Item[]): unknown;

declare function CharacterRefresh(char: Character, push?: boolean, dirty?: boolean): void;
declare function ChatRoomCharacterUpdate(char: Character): void;

declare function InventoryWear(
    char: Character, itemName: string, groupName: string,
    color?: string | string[], difficulty?: number,
    memberNumber?: number, craft?: CraftingItem
): void;

declare function InventoryRemove(char: Character, groupName: string, push?: boolean): void;
declare function InventoryAdd(char: Character, assetName: string, groupName: string, push?: boolean): void;
declare function InventoryGet(char: Character, groupName: string): Item | null;
declare function AssetGet(family: string, group: string, name: string): Asset | null;

declare function PreferenceRegisterExtensionSetting(setting: ExtensionSetting): void;

declare function ElementCreateInput(
    id: string, type: string, value: string, maxLength?: string
): HTMLInputElement;
declare function ElementRemove(id: string): void;
declare function ElementValue(id: string): string;
declare function ElementPosition(id: string, x: number, y: number, width: number, height?: number): void;

declare const bcModSDK: {
    registerMod(
        info: { name: string; fullName: string; version: string },
        options?: { allowReplace?: boolean }
    ): ModSDKModAPI;
};

interface ModSDKModAPI {
    hookFunction(
        funcName: string,
        priority: number,
        hook: (args: unknown[], next: (args: unknown[]) => unknown) => unknown
    ): void;
    patchFunction(funcName: string, patches: Record<string, string>): void;
    isPatched(funcName: string): boolean;
    unload(): void;
}
