/* tslint:disable */
/* eslint-disable */
/**
 * Nabto WebRTC Signaling
 * No description provided (generated by Openapi Generator https://github.com/openapitools/openapi-generator)
 *
 * The version of the OpenAPI document: 1.0.0
 * 
 *
 * NOTE: This class is auto generated by OpenAPI Generator (https://openapi-generator.tech).
 * https://openapi-generator.tech
 * Do not edit the class manually.
 */

import { mapValues } from '../runtime';
/**
 * Ice Servers Request Body
 * @export
 * @interface V1IceServersRequest
 */
export interface V1IceServersRequest {
    /**
     * 
     * @type {string}
     * @memberof V1IceServersRequest
     */
    deviceId: string;
    /**
     * 
     * @type {string}
     * @memberof V1IceServersRequest
     */
    productId: string;
}

/**
 * Check if a given object implements the V1IceServersRequest interface.
 */
export function instanceOfV1IceServersRequest(value: object): value is V1IceServersRequest {
    if (!('deviceId' in value) || value['deviceId'] === undefined) return false;
    if (!('productId' in value) || value['productId'] === undefined) return false;
    return true;
}

export function V1IceServersRequestFromJSON(json: any): V1IceServersRequest {
    return V1IceServersRequestFromJSONTyped(json, false);
}

export function V1IceServersRequestFromJSONTyped(json: any, ignoreDiscriminator: boolean): V1IceServersRequest {
    if (json == null) {
        return json;
    }
    return {
        
        'deviceId': json['deviceId'],
        'productId': json['productId'],
    };
}

export function V1IceServersRequestToJSON(json: any): V1IceServersRequest {
    return V1IceServersRequestToJSONTyped(json, false);
}

export function V1IceServersRequestToJSONTyped(value?: V1IceServersRequest | null, ignoreDiscriminator: boolean = false): any {
    if (value == null) {
        return value;
    }

    return {
        
        'deviceId': value['deviceId'],
        'productId': value['productId'],
    };
}

