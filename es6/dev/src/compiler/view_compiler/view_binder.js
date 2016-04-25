import { ListWrapper } from 'angular2/src/facade/collection';
import { templateVisitAll } from '../template_ast';
import { bindRenderText, bindRenderInputs, bindDirectiveInputs, bindDirectiveHostProps } from './property_binder';
import { bindRenderOutputs, collectEventListeners, bindDirectiveOutputs } from './event_binder';
import { bindDirectiveAfterContentLifecycleCallbacks, bindDirectiveAfterViewLifecycleCallbacks, bindDirectiveDestroyLifecycleCallbacks, bindPipeDestroyLifecycleCallbacks, bindDirectiveDetectChangesLifecycleCallbacks } from './lifecycle_binder';
export function bindView(view, parsedTemplate) {
    var visitor = new ViewBinderVisitor(view);
    templateVisitAll(visitor, parsedTemplate);
    view.pipes.forEach((pipe) => { bindPipeDestroyLifecycleCallbacks(pipe.meta, pipe.instance, pipe.view); });
}
class ViewBinderVisitor {
    constructor(view) {
        this.view = view;
        this._nodeIndex = 0;
    }
    visitBoundText(ast, parent) {
        var node = this.view.nodes[this._nodeIndex++];
        bindRenderText(ast, node, this.view);
        return null;
    }
    visitText(ast, parent) {
        this._nodeIndex++;
        return null;
    }
    visitNgContent(ast, parent) { return null; }
    visitElement(ast, parent) {
        var compileElement = this.view.nodes[this._nodeIndex++];
        var eventListeners = collectEventListeners(ast.outputs, ast.directives, compileElement);
        bindRenderInputs(ast.inputs, compileElement);
        bindRenderOutputs(eventListeners);
        ListWrapper.forEachWithIndex(ast.directives, (directiveAst, index) => {
            var directiveInstance = compileElement.directiveInstances[index];
            bindDirectiveInputs(directiveAst, directiveInstance, compileElement);
            bindDirectiveDetectChangesLifecycleCallbacks(directiveAst, directiveInstance, compileElement);
            bindDirectiveHostProps(directiveAst, directiveInstance, compileElement);
            bindDirectiveOutputs(directiveAst, directiveInstance, eventListeners);
        });
        templateVisitAll(this, ast.children, compileElement);
        // afterContent and afterView lifecycles need to be called bottom up
        // so that children are notified before parents
        ListWrapper.forEachWithIndex(ast.directives, (directiveAst, index) => {
            var directiveInstance = compileElement.directiveInstances[index];
            bindDirectiveAfterContentLifecycleCallbacks(directiveAst.directive, directiveInstance, compileElement);
            bindDirectiveAfterViewLifecycleCallbacks(directiveAst.directive, directiveInstance, compileElement);
            bindDirectiveDestroyLifecycleCallbacks(directiveAst.directive, directiveInstance, compileElement);
        });
        return null;
    }
    visitEmbeddedTemplate(ast, parent) {
        var compileElement = this.view.nodes[this._nodeIndex++];
        var eventListeners = collectEventListeners(ast.outputs, ast.directives, compileElement);
        ListWrapper.forEachWithIndex(ast.directives, (directiveAst, index) => {
            var directiveInstance = compileElement.directiveInstances[index];
            bindDirectiveInputs(directiveAst, directiveInstance, compileElement);
            bindDirectiveDetectChangesLifecycleCallbacks(directiveAst, directiveInstance, compileElement);
            bindDirectiveOutputs(directiveAst, directiveInstance, eventListeners);
            bindDirectiveAfterContentLifecycleCallbacks(directiveAst.directive, directiveInstance, compileElement);
            bindDirectiveAfterViewLifecycleCallbacks(directiveAst.directive, directiveInstance, compileElement);
            bindDirectiveDestroyLifecycleCallbacks(directiveAst.directive, directiveInstance, compileElement);
        });
        return null;
    }
    visitAttr(ast, ctx) { return null; }
    visitDirective(ast, ctx) { return null; }
    visitEvent(ast, eventTargetAndNames) {
        return null;
    }
    visitVariable(ast, ctx) { return null; }
    visitDirectiveProperty(ast, context) { return null; }
    visitElementProperty(ast, context) { return null; }
}
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoidmlld19iaW5kZXIuanMiLCJzb3VyY2VSb290IjoiIiwic291cmNlcyI6WyJkaWZmaW5nX3BsdWdpbl93cmFwcGVyLW91dHB1dF9wYXRoLWk5cDlkZUt1LnRtcC9hbmd1bGFyMi9zcmMvY29tcGlsZXIvdmlld19jb21waWxlci92aWV3X2JpbmRlci50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiT0FBTyxFQUNMLFdBQVcsRUFDWixNQUFNLGdDQUFnQztPQUNoQyxFQWNMLGdCQUFnQixFQUdqQixNQUFNLGlCQUFpQjtPQUNqQixFQUNMLGNBQWMsRUFDZCxnQkFBZ0IsRUFDaEIsbUJBQW1CLEVBQ25CLHNCQUFzQixFQUN2QixNQUFNLG1CQUFtQjtPQUNuQixFQUFDLGlCQUFpQixFQUFFLHFCQUFxQixFQUFFLG9CQUFvQixFQUFDLE1BQU0sZ0JBQWdCO09BQ3RGLEVBQ0wsMkNBQTJDLEVBQzNDLHdDQUF3QyxFQUN4QyxzQ0FBc0MsRUFDdEMsaUNBQWlDLEVBQ2pDLDRDQUE0QyxFQUM3QyxNQUFNLG9CQUFvQjtBQUkzQix5QkFBeUIsSUFBaUIsRUFBRSxjQUE2QjtJQUN2RSxJQUFJLE9BQU8sR0FBRyxJQUFJLGlCQUFpQixDQUFDLElBQUksQ0FBQyxDQUFDO0lBQzFDLGdCQUFnQixDQUFDLE9BQU8sRUFBRSxjQUFjLENBQUMsQ0FBQztJQUMxQyxJQUFJLENBQUMsS0FBSyxDQUFDLE9BQU8sQ0FDZCxDQUFDLElBQUksT0FBTyxpQ0FBaUMsQ0FBQyxJQUFJLENBQUMsSUFBSSxFQUFFLElBQUksQ0FBQyxRQUFRLEVBQUUsSUFBSSxDQUFDLElBQUksQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUM7QUFDN0YsQ0FBQztBQUVEO0lBR0UsWUFBbUIsSUFBaUI7UUFBakIsU0FBSSxHQUFKLElBQUksQ0FBYTtRQUY1QixlQUFVLEdBQVcsQ0FBQyxDQUFDO0lBRVEsQ0FBQztJQUV4QyxjQUFjLENBQUMsR0FBaUIsRUFBRSxNQUFzQjtRQUN0RCxJQUFJLElBQUksR0FBRyxJ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QVksRUFBRSxpQkFBaUIsRUFBRSxjQUFjLENBQUMsQ0FBQztZQUNyRSw0Q0FBNEMsQ0FBQyxZQUFZLEVBQUUsaUJBQWlCLEVBQUUsY0FBYyxDQUFDLENBQUM7WUFDOUYsb0JBQW9CLENBQUMsWUFBWSxFQUFFLGlCQUFpQixFQUFFLGNBQWMsQ0FBQyxDQUFDO1lBQ3RFLDJDQUEyQyxDQUFDLFlBQVksQ0FBQyxTQUFTLEVBQUUsaUJBQWlCLEVBQ3pDLGNBQWMsQ0FBQyxDQUFDO1lBQzVELHdDQUF3QyxDQUFDLFlBQVksQ0FBQyxTQUFTLEVBQUUsaUJBQWlCLEVBQ3pDLGNBQWMsQ0FBQyxDQUFDO1lBQ3pELHNDQUFzQyxDQUFDLFlBQVksQ0FBQyxTQUFTLEVBQUUsaUJBQWlCLEVBQ3pDLGNBQWMsQ0FBQyxDQUFDO1FBQ3pELENBQUMsQ0FBQyxDQUFDO1FBQ0gsTUFBTSxDQUFDLElBQUksQ0FBQztJQUNkLENBQUM7SUFFRCxTQUFTLENBQUMsR0FBWSxFQUFFLEdBQVEsSUFBUyxNQUFNLENBQUMsSUFBSSxDQUFDLENBQUMsQ0FBQztJQUN2RCxjQUFjLENBQUMsR0FBaUIsRUFBRSxHQUFRLElBQVMsTUFBTSxDQUFDLElBQUksQ0FBQyxDQUFDLENBQUM7SUFDakUsVUFBVSxDQUFDLEdBQWtCLEVBQUUsbUJBQStDO1FBQzVFLE1BQU0sQ0FBQyxJQUFJLENBQUM7SUFDZCxDQUFDO0lBRUQsYUFBYSxDQUFDLEdBQWdCLEVBQUUsR0FBUSxJQUFTLE1BQU0sQ0FBQyxJQUFJLENBQUMsQ0FBQyxDQUFDO0lBQy9ELHNCQUFzQixDQUFDLEdBQThCLEVBQUUsT0FBWSxJQUFTLE1BQU0sQ0FBQyxJQUFJLENBQUMsQ0FBQyxDQUFDO0lBQzFGLG9CQUFvQixDQUFDLEdBQTRCLEVBQUUsT0FBWSxJQUFTLE1BQU0sQ0FBQyxJQUFJLENBQUMsQ0FBQyxDQUFDO0FBQ3hGLENBQUM7QUFBQSIsInNvdXJjZXNDb250ZW50IjpbImltcG9ydCB7XG4gIExpc3RXcmFwcGVyLFxufSBmcm9tICdhbmd1bGFyMi9zcmMvZmFjYWRlL2NvbGxlY3Rpb24nO1xuaW1wb3J0IHtcbiAgVGVtcGxhdGVBc3QsXG4gIFRlbXBsYXRlQXN0VmlzaXRvcixcbiAgTmdDb250ZW50QXN0LFxuICBFbWJlZGRlZFRlbXBsYXRlQXN0LFxuICBFbGVtZW50QXN0LFxuICBWYXJpYWJsZUFzdCxcbiAgQm91bmRFdmVudEFzdCxcbiAgQm91bmRFbGVtZW50UHJvcGVydHlBc3QsXG4gIEF0dHJBc3QsXG4gIEJvdW5kVGV4dEFzdCxcbiAgVGV4dEFzdCxcbiAgRGlyZWN0aXZlQXN0LFxuICBCb3VuZERpcmVjdGl2ZVByb3BlcnR5QXN0LFxuICB0ZW1wbGF0ZVZpc2l0QWxsLFxuICBQcm9wZXJ0eUJpbmRpbmdUeXBlLFxuICBQcm92aWRlckFzdFxufSBmcm9tICcuLi90ZW1wbGF0ZV9hc3QnO1xuaW1wb3J0IHtcbiAgYmluZFJlbmRlclRleHQsXG4gIGJpbmRSZW5kZXJJbnB1dHMsXG4gIGJpbmREaXJlY3RpdmVJbnB1dHMsXG4gIGJpbmREaXJlY3RpdmVIb3N0UHJvcHNcbn0gZnJvbSAnLi9wcm9wZXJ0eV9iaW5kZXInO1xuaW1wb3J0IHtiaW5kUmVuZGVyT3V0cHV0cywgY29sbGVjdEV2ZW50TGlzdGVuZXJzLCBiaW5kRGlyZWN0aXZlT3V0cHV0c30gZnJvbSAnLi9ldmVudF9iaW5kZXInO1xuaW1wb3J0IHtcbiAgYmluZERpcmVjdGl2ZUFmdGVyQ29udGVudExpZmVjeWNsZUNhbGxiYWNrcyxcbiAgYmluZERpcmVjdGl2ZUFmdGVyVmlld0xpZmVjeWNsZUNhbGxiYWNrcyxcbiAgYmluZERpcmVjdGl2ZURlc3Ryb3lMaWZlY3ljbGVDYWxsYmFja3MsXG4gIGJpbmRQaXBlRGVzdHJveUxpZmVjeWNsZUNhbGxiYWNrcyxcbiAgYmluZERpcmVjdGl2ZURldGVjdENoYW5nZXNMaWZlY3ljbGVDYWxsYmFja3Ncbn0gZnJvbSAnLi9saWZlY3ljbGVfYmluZGVyJztcbmltcG9ydCB7Q29tcGlsZVZpZXd9IGZyb20gJy4vY29tcGlsZV92aWV3JztcbmltcG9ydCB7Q29tcGlsZUVsZW1lbnQsIENvbXBpbGVOb2RlfSBmcm9tICcuL2NvbXBpbGVfZWxlbWVudCc7XG5cbmV4cG9ydCBmdW5jdGlvbiBiaW5kVmlldyh2aWV3OiBDb21waWxlVmlldywgcGFyc2VkVGVtcGxhdGU6IFRlbXBsYXRlQXN0W10pOiB2b2lkIHtcbiAgdmFyIHZpc2l0b3IgPSBuZXcgVmlld0JpbmRlclZpc2l0b3Iodmlldyk7XG4gIHRlbXBsYXRlVmlzaXRBbGwodmlzaXRvciwgcGFyc2VkVGVtcGxhdGUpO1xuICB2aWV3LnBpcGVzLmZvckVhY2goXG4gICAgICAocGlwZSkgPT4geyBiaW5kUGlwZURlc3Ryb3lMaWZlY3ljbGVDYWxsYmFja3MocGlwZS5tZXRhLCBwaXBlLmluc3RhbmNlLCBwaXBlLnZpZXcpOyB9KTtcbn1cblxuY2xhc3MgVmlld0JpbmRlclZpc2l0b3IgaW1wbGVtZW50cyBUZW1wbGF0ZUFzdFZpc2l0b3Ige1xuICBwcml2YXRlIF9ub2RlSW5kZXg6IG51bWJlciA9IDA7XG5cbiAgY29uc3RydWN0b3IocHVibGljIHZpZXc6IENvbXBpbGVWaWV3KSB7fVxuXG4gIHZpc2l0Qm91bmRUZXh0KGFzdDogQm91bmRUZXh0QXN0LCBwYXJlbnQ6IENvbXBpbGVFbGVtZW50KTogYW55IHtcbiAgICB2YXIgbm9kZSA9IHRoaXMudmlldy5ub2Rlc1t0aGlzLl9ub2RlSW5kZXgrK107XG4gICAgYmluZFJlbmRlclRleHQoYXN0LCBub2RlLCB0aGlzLnZpZXcpO1xuICAgIHJldHVybiBudWxsO1xuICB9XG4gIHZpc2l0VGV4dChhc3Q6IFRleHRBc3QsIHBhcmVudDogQ29tcGlsZUVsZW1lbnQpOiBhbnkge1xuICAgIHRoaXMuX25vZGVJbmRleCsrO1xuICAgIHJldHVybiBudWxsO1xuICB9XG5cbiAgdmlzaXROZ0NvbnRlbnQoYXN0OiBOZ0NvbnRlbnRBc3QsIHBhcmVudDogQ29tcGlsZUVsZW1lbnQpOiBhbnkgeyByZXR1cm4gbnVsbDsgfVxuXG4gIHZpc2l0RWxlbWVudChhc3Q6IEVsZW1lbnRBc3QsIHBhcmVudDogQ29tcGlsZUVsZW1lbnQpOiBhbnkge1xuICAgIHZhciBjb21waWxlRWxlbWVudCA9IDxDb21waWxlRWxlbWVudD50aGlzLnZpZXcubm9kZXNbdGhpcy5fbm9kZUluZGV4KytdO1xuICAgIHZhciBldmVudExpc3RlbmVycyA9IGNvbGxlY3RFdmVudExpc3RlbmVycyhhc3Qub3V0cHV0cywgYXN0LmRpcmVjdGl2ZXMsIGNvbXBpbGVFbGVtZW50KTtcbiAgICBiaW5kUmVuZGVySW5wdXRzKGFzdC5pbnB1dHMsIGNvbXBpbGVFbGVtZW50KTtcbiAgICBiaW5kUmVuZGVyT3V0cHV0cyhldmVudExpc3RlbmVycyk7XG4gICAgTGlzdFdyYXBwZXIuZm9yRWFjaFdpdGhJbmRleChhc3QuZGlyZWN0aXZlcywgKGRpcmVjdGl2ZUFzdCwgaW5kZXgpID0+IHtcbiAgICAgIHZhciBkaXJlY3RpdmVJbnN0YW5jZSA9IGNvbXBpbGVFbGVtZW50LmRpcmVjdGl2ZUluc3RhbmNlc1tpbmRleF07XG4gICAgICBiaW5kRGlyZWN0aXZlSW5wdXRzKGRpcmVjdGl2ZUFzdCwgZGlyZWN0aXZlSW5zdGFuY2UsIGNvbXBpbGVFbGVtZW50KTtcbiAgICAgIGJpbmREaXJlY3RpdmVEZXRlY3RDaGFuZ2VzTGlmZWN5Y2xlQ2FsbGJhY2tzKGRpcmVjdGl2ZUFzdCwgZGlyZWN0aXZlSW5zdGFuY2UsIGNvbXBpbGVFbGVtZW50KTtcblxuICAgICAgYmluZERpcmVjdGl2ZUhvc3RQcm9wcyhkaXJlY3RpdmVBc3QsIGRpcmVjdGl2ZUluc3RhbmNlLCBjb21waWxlRWxlbWVudCk7XG4gICAgICBiaW5kRGlyZWN0aXZlT3V0cHV0cyhkaXJlY3RpdmVBc3QsIGRpcmVjdGl2ZUluc3RhbmNlLCBldmVudExpc3RlbmVycyk7XG4gICAgfSk7XG4gICAgdGVtcGxhdGVWaXNpdEFsbCh0aGlzLCBhc3QuY2hpbGRyZW4sIGNvbXBpbGVFbGVtZW50KTtcbiAgICAvLyBhZnRlckNvbnRlbnQgYW5kIGFmdGVyVmlldyBsaWZlY3ljbGVzIG5lZWQgdG8gYmUgY2FsbGVkIGJvdHRvbSB1cFxuICAgIC8vIHNvIHRoYXQgY2hpbGRyZW4gYXJlIG5vdGlmaWVkIGJlZm9yZSBwYXJlbnRzXG4gICAgTGlzdFdyYXBwZXIuZm9yRWFjaFdpdGhJbmRleChhc3QuZGlyZWN0aXZlcywgKGRpcmVjdGl2ZUFzdCwgaW5kZXgpID0+IHtcbiAgICAgIHZhciBkaXJlY3RpdmVJbnN0YW5jZSA9IGNvbXBpbGVFbGVtZW50LmRpcmVjdGl2ZUluc3RhbmNlc1tpbmRleF07XG4gICAgICBiaW5kRGlyZWN0aXZlQWZ0ZXJDb250ZW50TGlmZWN5Y2xlQ2FsbGJhY2tzKGRpcmVjdGl2ZUFzdC5kaXJlY3RpdmUsIGRpcmVjdGl2ZUluc3RhbmNlLFxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBjb21waWxlRWxlbWVudCk7XG4gICAgICBiaW5kRGlyZWN0aXZlQWZ0ZXJWaWV3TGlmZWN5Y2xlQ2FsbGJhY2tzKGRpcmVjdGl2ZUFzdC5kaXJlY3RpdmUsIGRpcmVjdGl2ZUluc3RhbmNlLFxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBjb21waWxlRWxlbWVudCk7XG4gICAgICBiaW5kRGlyZWN0aXZlRGVzdHJveUxpZmVjeWNsZUNhbGxiYWNrcyhkaXJlY3RpdmVBc3QuZGlyZWN0aXZlLCBkaXJlY3RpdmVJbnN0YW5jZSxcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIGNvbXBpbGVFbGVtZW50KTtcbiAgICB9KTtcbiAgICByZXR1cm4gbnVsbDtcbiAgfVxuXG4gIHZpc2l0RW1iZWRkZWRUZW1wbGF0ZShhc3Q6IEVtYmVkZGVkVGVtcGxhdGVBc3QsIHBhcmVudDogQ29tcGlsZUVsZW1lbnQpOiBhbnkge1xuICAgIHZhciBjb21waWxlRWxlbWVudCA9IDxDb21waWxlRWxlbWVudD50aGlzLnZpZXcubm9kZXNbdGhpcy5fbm9kZUluZGV4KytdO1xuICAgIHZhciBldmVudExpc3RlbmVycyA9IGNvbGxlY3RFdmVudExpc3RlbmVycyhhc3Qub3V0cHV0cywgYXN0LmRpcmVjdGl2ZXMsIGNvbXBpbGVFbGVtZW50KTtcbiAgICBMaXN0V3JhcHBlci5mb3JFYWNoV2l0aEluZGV4KGFzdC5kaXJlY3RpdmVzLCAoZGlyZWN0aXZlQXN0LCBpbmRleCkgPT4ge1xuICAgICAgdmFyIGRpcmVjdGl2ZUluc3RhbmNlID0gY29tcGlsZUVsZW1lbnQuZGlyZWN0aXZlSW5zdGFuY2VzW2luZGV4XTtcbiAgICAgIGJpbmREaXJlY3RpdmVJbnB1dHMoZGlyZWN0aXZlQXN0LCBkaXJlY3RpdmVJbnN0YW5jZSwgY29tcGlsZUVsZW1lbnQpO1xuICAgICAgYmluZERpcmVjdGl2ZURldGVjdENoYW5nZXNMaWZlY3ljbGVDYWxsYmFja3MoZGlyZWN0aXZlQXN0LCBkaXJlY3RpdmVJbnN0YW5jZSwgY29tcGlsZUVsZW1lbnQpO1xuICAgICAgYmluZERpcmVjdGl2ZU91dHB1dHMoZGlyZWN0aXZlQXN0LCBkaXJlY3RpdmVJbnN0YW5jZSwgZXZlbnRMaXN0ZW5lcnMpO1xuICAgICAgYmluZERpcmVjdGl2ZUFmdGVyQ29udGVudExpZmVjeWNsZUNhbGxiYWNrcyhkaXJlY3RpdmVBc3QuZGlyZWN0aXZlLCBkaXJlY3RpdmVJbnN0YW5jZSxcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgY29tcGlsZUVsZW1lbnQpO1xuICAgICAgYmluZERpcmVjdGl2ZUFmdGVyVmlld0xpZmVjeWNsZUNhbGxiYWNrcyhkaXJlY3RpdmVBc3QuZGlyZWN0aXZlLCBkaXJlY3RpdmVJbnN0YW5jZSxcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgY29tcGlsZUVsZW1lbnQpO1xuICAgICAgYmluZERpcmVjdGl2ZURlc3Ryb3lMaWZlY3ljbGVDYWxsYmFja3MoZGlyZWN0aXZlQXN0LmRpcmVjdGl2ZSwgZGlyZWN0aXZlSW5zdGFuY2UsXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBjb21waWxlRWxlbWVudCk7XG4gICAgfSk7XG4gICAgcmV0dXJuIG51bGw7XG4gIH1cblxuICB2aXNpdEF0dHIoYXN0OiBBdHRyQXN0LCBjdHg6IGFueSk6IGFueSB7IHJldHVybiBudWxsOyB9XG4gIHZpc2l0RGlyZWN0aXZlKGFzdDogRGlyZWN0aXZlQXN0LCBjdHg6IGFueSk6IGFueSB7IHJldHVybiBudWxsOyB9XG4gIHZpc2l0RXZlbnQoYXN0OiBCb3VuZEV2ZW50QXN0LCBldmVudFRhcmdldEFuZE5hbWVzOiBNYXA8c3RyaW5nLCBCb3VuZEV2ZW50QXN0Pik6IGFueSB7XG4gICAgcmV0dXJuIG51bGw7XG4gIH1cblxuICB2aXNpdFZhcmlhYmxlKGFzdDogVmFyaWFibGVBc3QsIGN0eDogYW55KTogYW55IHsgcmV0dXJuIG51bGw7IH1cbiAgdmlzaXREaXJlY3RpdmVQcm9wZXJ0eShhc3Q6IEJvdW5kRGlyZWN0aXZlUHJvcGVydHlBc3QsIGNvbnRleHQ6IGFueSk6IGFueSB7IHJldHVybiBudWxsOyB9XG4gIHZpc2l0RWxlbWVudFByb3BlcnR5KGFzdDogQm91bmRFbGVtZW50UHJvcGVydHlBc3QsIGNvbnRleHQ6IGFueSk6IGFueSB7IHJldHVybiBudWxsOyB9XG59XG4iXX0=