/* tslint:disable */
/* eslint-disable */
/**
 * Nabto WebRTC Signaling
 * Development documentation
 *
 * The version of the OpenAPI document: 1.0.0
 * 
 *
 * NOTE: This class is auto generated by OpenAPI Generator (https://openapi-generator.tech).
 * https://openapi-generator.tech
 * Do not edit the class manually.
 */

import { mapValues } from '../runtime';
import type { PostV1IceServers200ResponseIceServersInner } from './PostV1IceServers200ResponseIceServersInner';
import {
    PostV1IceServers200ResponseIceServersInnerFromJSON,
    PostV1IceServers200ResponseIceServersInnerFromJSONTyped,
    PostV1IceServers200ResponseIceServersInnerToJSON,
    PostV1IceServers200ResponseIceServersInnerToJSONTyped,
} from './PostV1IceServers200ResponseIceServersInner';

/**
 * Ice Servers
 * @export
 * @interface IceServers
 */
export interface IceServers {
    /**
     * 
     * @type {Array<PostV1IceServers200ResponseIceServersInner>}
     * @memberof IceServers
     */
    iceServers: Array<PostV1IceServers200ResponseIceServersInner>;
}

/**
 * Check if a given object implements the IceServers interface.
 */
export function instanceOfIceServers(value: object): value is IceServers {
    if (!('iceServers' in value) || value['iceServers'] === undefined) return false;
    return true;
}

export function IceServersFromJSON(json: any): IceServers {
    return IceServersFromJSONTyped(json, false);
}

export function IceServersFromJSONTyped(json: any, ignoreDiscriminator: boolean): IceServers {
    if (json == null) {
        return json;
    }
    return {
        
        'iceServers': ((json['iceServers'] as Array<any>).map(PostV1IceServers200ResponseIceServersInnerFromJSON)),
    };
}

  export function IceServersToJSON(json: any): IceServers {
      return IceServersToJSONTyped(json, false);
  }

  export function IceServersToJSONTyped(value?: IceServers | null, ignoreDiscriminator: boolean = false): any {
    if (value == null) {
        return value;
    }

    return {
        
        'iceServers': ((value['iceServers'] as Array<any>).map(PostV1IceServers200ResponseIceServersInnerToJSON)),
    };
}

