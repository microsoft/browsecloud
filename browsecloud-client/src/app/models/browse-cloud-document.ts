// Copyright (c) Microsoft Corporation. All rights reserved.
// Licensed under the MIT License.

import { autoserialize, autoserializeAs, SerializableEnumeration } from 'cerialize';

import { BrowseCloudUserIdentity } from './browse-cloud-user-identity';

export enum InputType {
    MetadataInput,
    SimpleInput,
}
SerializableEnumeration(InputType);

export function inputTypeToString(inputType: InputType): string {
    switch (inputType) {
        case InputType.SimpleInput:
            return 'Simple';
        case InputType.MetadataInput:
            return 'Metadata';
        default:
            return 'Unknown';
    }
}

/** Represents a document to be trained. */
export class BrowseCloudDocument {
    @autoserialize public id: string;
    @autoserialize public displayName: string;
    @autoserialize public description: string;
    @autoserializeAs(InputType) public inputType: InputType;
    @autoserializeAs(BrowseCloudUserIdentity) public owner: BrowseCloudUserIdentity;
    @autoserializeAs(BrowseCloudUserIdentity) public acl: BrowseCloudUserIdentity[];
    @autoserialize public isPublic: boolean;
    @autoserializeAs(Date) public submitDateTime: Date;
    @autoserializeAs(Date) public updateDateTime: Date;
}
