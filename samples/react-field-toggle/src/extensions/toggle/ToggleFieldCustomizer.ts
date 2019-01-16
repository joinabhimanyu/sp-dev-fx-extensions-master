import * as React from 'react';
import * as ReactDOM from 'react-dom';

import { Log } from '@microsoft/sp-core-library';
import { override } from '@microsoft/decorators';
import {
  CellFormatter,
  BaseFieldCustomizer,
  IFieldCustomizerCellEventParameters
} from '@microsoft/sp-listview-extensibility';
import { SPPermission } from "@microsoft/sp-page-context";
import pnp, { List, ItemUpdateResult, Item } from 'sp-pnp-js';

import * as strings from 'toggleStrings';
import Toggle from './components/Toggle';
import { IToggleProps } from './components/IToggleProps'

/**
 * If your field customizer uses the ClientSideComponentProperties JSON input,
 * it will be deserialized into the BaseExtension.properties object.
 * You can define an interface to describe it.
 */
export interface IToggleProperties {
  // This is an example; replace with your own property
  sampleText?: string;
}

const LOG_SOURCE: string = 'ToggleFieldCustomizer';

export default class ToggleFieldCustomizer
  extends BaseFieldCustomizer<IToggleProperties> {

  @override
  public onInit(): Promise<void> {
    // Add your custom initialization to this method.  The framework will wait
    // for the returned promise to resolve before firing any BaseFieldCustomizer events.
    Log.info(LOG_SOURCE, 'Activated ToggleFieldCustomizer with properties:');
    Log.info(LOG_SOURCE, JSON.stringify(this.properties, undefined, 2));
    Log.info(LOG_SOURCE, `The following string should be equal: "Toggle" and "${strings.Title}"`);
    return Promise.resolve<void>();
  }

  @override
  public onRenderCell(event: IFieldCustomizerCellEventParameters): void {
    // Use this method to perform your custom cell rendering.  The CellFormatter is a utility
    // that you can use to convert the cellValue to a text string.
    const value: string = event.cellValue;
    const id: string = event.row.getValueByName('ID').toString();
    const hasPermissions: boolean = this.context.pageContext.list.permissions.hasPermission(SPPermission.editListItems);

    const toggle: React.ReactElement<{}> =
      React.createElement(Toggle, { checked: value, id: id, disabled: !hasPermissions, onChanged: this.onToggleValueChanged.bind(this) } as IToggleProps);

    ReactDOM.render(toggle, event.cellDiv);

  }

  @override
  public onDisposeCell(event: IFieldCustomizerCellEventParameters): void {
    // This method should be used to free any resources that were allocated during rendering.
    // For example, if your onRenderCell() called ReactDOM.render(), then you should
    // call ReactDOM.unmountComponentAtNode() here.
    ReactDOM.unmountComponentAtNode(event.cellDiv);
    super.onDisposeCell(event);
  }

  private onToggleValueChanged(value: boolean, id: string): void {

    let etag: string = undefined;
    pnp.sp.web.lists.getByTitle(this.context.pageContext.list.title).items.getById(parseInt(id)).get(undefined, {
      headers: {
        'Accept': 'application/json;odata=minimalmetadata'
      }
    })
      .then((item: Item): Promise<any> => {
        etag = item["odata.etag"];
        return Promise.resolve((item as any) as any);
      })
      .then((item: any): Promise<ItemUpdateResult> => {
        let updateObj: any = {};
        updateObj[this.context.field.internalName] = value;
        return pnp.sp.web.lists.getByTitle(this.context.pageContext.list.title)
          .items.getById(parseInt(id)).update(updateObj, etag);
      })
      .then((result: ItemUpdateResult): void => {
        console.log(`Item with ID: ${id} successfully updated`);
      }, (error: any): void => {
        console.log('Loading latest item failed with error: ' + error);
      });
  }
}
